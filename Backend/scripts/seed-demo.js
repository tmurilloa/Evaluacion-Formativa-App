import mongoose from 'mongoose'
import dotenv from 'dotenv'
import Teacher from '../src/models/Teacher.js'
import Roster from '../src/models/Roster.js'
import Evaluation from '../src/models/Evaluation.js'
import Question from '../src/models/Question.js'
import { hashEmail } from '../src/utils/anon.js'

dotenv.config()

// CONFIGURACION DE LA DEMO
// Cambiar solo esta seccion para ajustar el escenario.

const DIRECTIVO = { email: 'demo.directivo@unal.edu.co', name: 'Directivo Demo' }

const DOCENTES = [
  // "Bueno": cobertura suficiente (8/25 = 32%) y promedio alto
    { email: 'demo.docente1@unal.edu.co', name: 'Ana Restrepo',   subject: 'Calculo I',
        matriculados: 25, evaluadores: 8, promedioEstudiantes: 4.4, autoevaluacion: 4.2 },

  // "Critico" + brecha grande: se califica 4.5 y sus estudiantes le dan 2.6
    { email: 'demo.docente2@unal.edu.co', name: 'Carlos Munoz',   subject: 'Fisica II',
        matriculados: 20, evaluadores: 7, promedioEstudiantes: 2.6, autoevaluacion: 4.5 },

  // "Muestra insuficiente": 6 evaluaciones pasan el piso de 5, pero 6/40 = 15%
    { email: 'demo.docente3@unal.edu.co', name: 'Luisa Cardona',  subject: 'Programacion',
        matriculados: 40, evaluadores: 6, promedioEstudiantes: 3.6, autoevaluacion: null },

  // "Sin datos": solo autoevaluacion
    { email: 'demo.docente4@unal.edu.co', name: 'Jorge Betancur', subject: 'Bases de Datos',
        matriculados: 15, evaluadores: 0, promedioEstudiantes: null, autoevaluacion: 4.0 }
]

const ESTUDIANTES = Array.from({ length: 8 }, (_, i) => `demo.estudiante${i + 1}@unal.edu.co`)

// Frases con palabras repetidas a proposito, para que el analisis de
// terminos frecuentes y los bigramas tengan algo que mostrar.
const RESPUESTAS_ABIERTAS = [
    'Explica muy bien los temas y responde las dudas con paciencia.',
    'Explica bien y siempre responde las dudas de todos.',
    'El material del curso es claro y los ejemplos ayudan mucho.',
    'Deberia dar mas tiempo para las entregas del curso.',
    'Falta mas tiempo para resolver los talleres.',
    'Va muy rapido explicando algunos temas.',
    'No alcanza el tiempo en las entregas, va muy rapido.',
    'Mas ejercicios practicos durante la clase.',
    'Mas talleres practicos y menos teoria.',
    'Subir el material con anticipacion.'
]


// Genera puntajes enteros 1-5 cuyo promedio queda muy cerca del objetivo.
function generarPuntajes(objetivo, numeros) {
    const base = Math.floor(objetivo)
    const fraccion = Math.round((objetivo - base) * 10)
    const scores = {}

    numeros.forEach((n, i) => {
        // De cada 10 preguntas, 'fraccion' reciben el entero de arriba.
        let valor = (i % 10) < fraccion ? base + 1 : base
        // Dispersion ocasional para que no queden todas iguales.
        if (i % 7 === 0) valor += Math.random() < 0.5 ? -1 : 1
        scores[String(n)] = Math.min(5, Math.max(1, valor))
    })

    return scores
}

function generarAbiertas(numeros, semilla) {
    const answers = {}
    numeros.forEach((n, i) => {
        answers[String(n)] = RESPUESTAS_ABIERTAS[(semilla + i * 3) % RESPUESTAS_ABIERTAS.length]
    })
    return answers
}

const promedio = obj => {
    const v = Object.values(obj)
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0
}

async function run() {
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('Conectado a MongoDB\n')

    const preguntasEst = await Question.find({ type: 'student' })
    const preguntasDoc = await Question.find({ type: 'teacher' })
    if (!preguntasEst.length || !preguntasDoc.length) {
        throw new Error('No hay preguntas en la base. Corre primero: npm run seed')
    }

    const likertEst  = preguntasEst.filter(q => q.questionType === 'likert').map(q => q.number)
    const abiertaEst = preguntasEst.filter(q => q.questionType === 'abierta').map(q => q.number)
    const likertDoc  = preguntasDoc.filter(q => q.questionType === 'likert').map(q => q.number)
    const abiertaDoc = preguntasDoc.filter(q => q.questionType === 'abierta').map(q => q.number)

  // Limpieza ACOTADA: solo borra los datos de esta demo, nada mas.
    const correos = DOCENTES.map(d => d.email)
    await Evaluation.deleteMany({ teacherId: { $in: correos } })
    await Teacher.deleteMany({ id: { $in: correos } })
    await Roster.deleteMany({ email: { $in: [...correos, DIRECTIVO.email] } })
    console.log('Datos de demo anteriores eliminados\n')

  // Padron: quien es docente y quien directivo
    await Roster.create({ email: DIRECTIVO.email, role: 'directivo', name: DIRECTIVO.name })
    for (const d of DOCENTES) {
        await Roster.create({ email: d.email, role: 'docente', name: d.name, subject: d.subject })
    }

    for (const d of DOCENTES) {
        await Teacher.create({
            id: d.email, name: d.name, subject: d.subject, enrolledStudents: d.matriculados
    })

    // Autoevaluacion
    if (d.autoevaluacion !== null) {
        await Evaluation.create({
            teacherId: d.email,
            evaluatorKey: hashEmail(d.email),
            userRole: 'docente',
            status: 'submitted',
            evaluationData: {
                scores: generarPuntajes(d.autoevaluacion, likertDoc),
                openAnswers: generarAbiertas(abiertaDoc, 0)
        }
        })
    }

    // Evaluaciones de estudiantes
    for (let i = 0; i < d.evaluadores; i++) {
        await Evaluation.create({
            teacherId: d.email,
            evaluatorKey: hashEmail(ESTUDIANTES[i]),
            userRole: 'estudiante',
            status: 'submitted',
            evaluationData: {
                scores: generarPuntajes(d.promedioEstudiantes, likertEst),
                openAnswers: generarAbiertas(abiertaEst, i)
            }
        })
        }
    }

  // Verificacion: promedios y cobertura REALES que quedaron
    console.log('Resultado:\n')
    for (const d of DOCENTES) {
        const evals = await Evaluation.find({ teacherId: d.email, userRole: 'estudiante' })
        const todos = evals.flatMap(e => Object.values(Object.fromEntries(e.evaluationData.scores)))
        const prom = todos.length ? (todos.reduce((a, b) => a + b, 0) / todos.length) : 0
        const cob = d.matriculados ? Math.round((evals.length / d.matriculados) * 100) : 0
        console.log(`  ${d.name.padEnd(18)} promedio ${prom.toFixed(2)}  cobertura ${evals.length}/${d.matriculados} (${cob}%)`)
    }

    await mongoose.connection.close()
    console.log('\nListo')
}

run().catch(err => { console.error('Error:', err.message); process.exit(1) })