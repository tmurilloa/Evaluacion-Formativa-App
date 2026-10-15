// Siembra el escenario de demo definido en demo-config.js.
// Uso:  npm run seed:demo
// BORRA evaluaciones, docentes, padron y planes de mejoramiento.

import 'dotenv/config'
import mongoose from 'mongoose'
import Teacher from '../src/models/Teacher.js'
import Roster from '../src/models/Roster.js'
import Evaluation from '../src/models/Evaluation.js'
import Question from '../src/models/Question.js'
import ImprovementPlan from '../src/models/ImprovementPlan.js'
import { hashEmail } from '../src/utils/anon.js'
import {
    SEMILLA, DIRECTIVOS, DOCENTES, RETROALIMENTACIONES, RESPUESTAS_GENERALES
} from './demo-config.js'

// ---------------------------------------------------------------------------
// Azar reproducible: la misma SEMILLA produce siempre los mismos puntajes.
function crearAzar(semilla) {
    let a = semilla >>> 0
    return () => {
        a = (a + 0x6D2B79F5) >>> 0
        let t = a
        t = Math.imul(t ^ (t >>> 15), t | 1)
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}
const azar = crearAzar(SEMILLA)

// Un puntaje entero 1-5 cuyo valor esperado es el objetivo.
function puntaje(objetivo) {
    const base = Math.floor(objetivo)
    let valor = azar() < objetivo - base ? base + 1 : base
  if (azar() < 0.15) valor += azar() < 0.5 ? -1 : 1   // algo de dispersion
    return Math.min(5, Math.max(1, valor))
}

// 'estudiantes' / 'autoevaluacion' (numero u objeto) -> objetivo por categoria
function objetivos(valor, categorias, quien) {
    if (valor === null || valor === undefined) return null
    if (typeof valor === 'number') {
        return Object.fromEntries(categorias.map(c => [c, valor]))
    }
        const desconocidas = Object.keys(valor).filter(c => !categorias.includes(c))
    if (desconocidas.length) {
        throw new Error(`${quien}: categoria desconocida ${desconocidas.map(c => `"${c}"`).join(', ')}.\n` +
        `  Validas: ${categorias.map(c => `"${c}"`).join(', ')}`)
    }
    const faltantes = categorias.filter(c => !(c in valor))
    if (faltantes.length) throw new Error(`${quien}: falta el promedio de ${faltantes.join(', ')}`)
    return valor
}

function puntajes(obj, likert) {
    return Object.fromEntries(likert.map(q => [String(q.number), puntaje(obj[q.category])]))
}

function abiertas(preguntas, banco, desde) {
    return Object.fromEntries(preguntas.map((q, i) => [String(q.number), banco[(desde + i) % banco.length]]))
}

const media = arr => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0)
const correo = e => e.trim().toLowerCase()

// ---------------------------------------------------------------------------
async function run() {
    // Candado: este script BORRA todo. Nunca contra la base del piloto.
    if ((process.env.MONGODB_URI || '').toLowerCase().includes('piloto')) {
        throw new Error('seed:demo NO se puede correr contra la base del piloto (la URI contiene "piloto").')
    }
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('Conectado a MongoDB\n')

    const preguntas = await Question.find()
    const likertEst  = preguntas.filter(q => q.type === 'student' && q.questionType === 'likert')
    const abiertaEst = preguntas.filter(q => q.type === 'student' && q.questionType === 'abierta')
    const likertDoc  = preguntas.filter(q => q.type === 'teacher' && q.questionType === 'likert')
    const abiertaDoc = preguntas.filter(q => q.type === 'teacher' && q.questionType === 'abierta')
    if (!likertEst.length || !likertDoc.length) {
        throw new Error('No hay preguntas en la base. Corre primero: npm run seed')
    }
    const categorias = [...new Set(likertEst.map(q => q.category))]

  // --- Validar TODO antes de borrar nada -----------------------------------
    const docentes = DOCENTES.map(d => ({
        ...d,
        email: correo(d.email),
        objEst: objetivos(d.estudiantes, categorias, d.name),
        objDoc: objetivos(d.autoevaluacion, categorias, `${d.name} (autoevaluacion)`)
    }))
    for (const d of docentes) {
        if (d.evaluaciones > 0 && !d.objEst) {
            throw new Error(`${d.name}: tiene ${d.evaluaciones} evaluaciones pero 'estudiantes' es null`)
        }
    }
    const correosDocentes = new Set(docentes.map(d => d.email))
    for (const r of RETROALIMENTACIONES) {
        const ids = r.docentes.map(correo)
        const ajenos = ids.filter(id => !correosDocentes.has(id))
        if (ajenos.length) throw new Error(`Retroalimentacion "${r.goal}": docentes que no estan en DOCENTES: ${ajenos.join(', ')}`)
        if (r.tipo === 'individual' && ids.length !== 1) throw new Error(`Retroalimentacion "${r.goal}": una individual lleva exactamente un docente`)
        if (r.tipo === 'colectiva' && ids.length < 2) throw new Error(`Retroalimentacion "${r.goal}": una colectiva lleva al menos dos docentes`)
    }

  // --- Borrar ----------------------------------------------------------------
    await Promise.all([
        Evaluation.deleteMany({}),
        Teacher.deleteMany({}),
        Roster.deleteMany({}),
        ImprovementPlan.deleteMany({})
    ])
    console.log('Base limpia (evaluaciones, docentes, padron, planes)\n')

  // --- Padron y docentes -------------------------------------------------------
    for (const dir of DIRECTIVOS) {
        await Roster.create({ email: correo(dir.email), role: 'directivo', name: dir.name })
    }
    for (const d of docentes) {
    await Roster.create({ email: d.email, role: 'docente', name: d.name, subject: d.subject })
    await Teacher.create({ id: d.email, name: d.name, subject: d.subject, enrolledStudents: d.matriculados })
    }

  // --- Evaluaciones ------------------------------------------------------------
    const nEst = Math.max(0, ...docentes.map(d => d.evaluaciones))
    const estudiantes = Array.from({ length: nEst }, (_, i) => `demo.estudiante${i + 1}@unal.edu.co`)

    for (const d of docentes) {
        if (d.objDoc) {
            await Evaluation.create({
                teacherId: d.email, evaluatorKey: hashEmail(d.email), userRole: 'docente', status: 'submitted',
                evaluationData: {
                scores: puntajes(d.objDoc, likertDoc),
                openAnswers: abiertas(abiertaDoc, RESPUESTAS_GENERALES, 0)
        }
        })
    }
    const banco = d.comentarios?.length ? d.comentarios : RESPUESTAS_GENERALES
    for (let i = 0; i < d.evaluaciones; i++) {
        await Evaluation.create({
            teacherId: d.email, evaluatorKey: hashEmail(estudiantes[i]), userRole: 'estudiante', status: 'submitted',
            evaluationData: {
                scores: puntajes(d.objEst, likertEst),
                openAnswers: abiertas(abiertaEst, banco, i)
            }
            })
        }
    }

  // --- Retroalimentacion de la direccion -------------------------------------
    const autor = correo(DIRECTIVOS[0].email)
    for (const r of RETROALIMENTACIONES) {
        const ids = r.docentes.map(correo)
        const base = {
        userEmail: autor, authorRole: 'directivo',
        period: r.period, comments: r.comments || '',
        goal: r.goal, actions: r.actions, indicators: r.indicators, deadline: r.deadline
    }
    await ImprovementPlan.create(r.tipo === 'colectiva'
        ? { ...base, scope: 'colectiva', teacherIds: ids }
        : { ...base, scope: 'individual', teacherId: ids[0] })
    }

  // --- Resumen: lo que realmente quedo -----------------------------------------
    console.log('RESULTADO (valores reales en la base)\n')
    const porCategoria = Object.fromEntries(categorias.map(c => [c, []]))
    for (const d of docentes) {
        const evals = await Evaluation.find({ teacherId: d.email, userRole: 'estudiante' })
        const todos = []
        const cat = Object.fromEntries(categorias.map(c => [c, []]))
        for (const e of evals) {
        for (const q of likertEst) {
            const v = e.evaluationData.scores.get(String(q.number))
            todos.push(v); cat[q.category].push(v); porCategoria[q.category].push(v)
        }
    }
    const auto = await Evaluation.findOne({ teacherId: d.email, userRole: 'docente' })
    const autoProm = auto ? media([...auto.evaluationData.scores.values()]) : null
    const cob = d.matriculados ? Math.round((evals.length / d.matriculados) * 100) : 0
    console.log(`  ${d.name}`)
    console.log(`    estudiantes ${evals.length ? media(todos).toFixed(2) : '  - '}   ` +
        `autoevaluacion ${autoProm !== null ? autoProm.toFixed(2) : '  - '}   ` +
        `cobertura ${evals.length}/${d.matriculados} (${cob}%)`)
    if (evals.length) {
        console.log('    ' + categorias.map(c => `${c.split(' ')[0]} ${media(cat[c]).toFixed(1)}`).join(' · '))
    }
    }

    console.log('\n  Institucional por categoria:')
    categorias
        .map(c => [c, media(porCategoria[c])])
        .sort((a, b) => b[1] - a[1])
        .forEach(([c, v]) => console.log(`    ${v.toFixed(2)}  ${c}`))

    console.log(`\n  Retroalimentaciones: ${RETROALIMENTACIONES.length}`)
    console.log('\nCuentas que deben existir en Clerk para iniciar sesion:')
    DIRECTIVOS.forEach(d => console.log(`  directivo  ${correo(d.email)}`))
    docentes.forEach(d => console.log(`  docente    ${d.email}`))
    console.log('  estudiante cualquier otro correo @unal.edu.co (NO uses demo.estudianteN)')

    await mongoose.connection.close()
    console.log('\nListo')
}

run().catch(async err => {
    console.error('\nError:', err.message)
    await mongoose.connection.close().catch(() => {})
    process.exit(1)
})