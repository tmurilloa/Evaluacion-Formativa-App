// =========================================================================
// CARGA DEL PILOTO: padron, docentes e inscripciones desde las listas Excel.
//
// Uso (desde Backend/):
//   npm run piloto:cargar              -> SOLO revisa y muestra el reporte
//   npm run piloto:cargar -- --aplicar -> escribe en la base
//
// Lee:
//   piloto/grupos.xlsx   hoja "grupos":     ARCHIVO | CORREO DOCENTE | NOMBRE DOCENTE | ASIGNATURA | GRUPO
//                        hoja "directivos": CORREO | NOMBRE
//   piloto/listas/       las listas que mandan los profesores (.xls o .xlsx),
//                        con una columna CORREO
//
// Es seguro correrlo varias veces: nunca borra evaluaciones. Si un profesor
// manda una lista corregida, se reemplaza el archivo y se vuelve a correr.
//
// Privacidad: de los estudiantes solo se guarda su codigo anonimo
// (hashEmail). Nombres, documentos y correos de las listas NO entran a la base.
// =========================================================================

import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import mongoose from 'mongoose'
import * as XLSX from 'xlsx'
import Teacher from '../src/models/Teacher.js'
import Roster from '../src/models/Roster.js'
import Enrollment from '../src/models/Enrollment.js'
import Evaluation from '../src/models/Evaluation.js'
import Question from '../src/models/Question.js'
import ImprovementPlan from '../src/models/ImprovementPlan.js'
import { hashEmail, huellaSecreto } from '../src/utils/anon.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CARPETA = path.join(__dirname, '..', 'piloto')
const LISTAS = path.join(CARPETA, 'listas')
const MANIFIESTO = path.join(CARPETA, 'grupos.xlsx')
const APLICAR = process.argv.includes('--aplicar')
const DOMINIO = '@unal.edu.co'

// ---------------------------------------------------------------------------
// Utilidades

// "Correo  Docente" / "correo docente" / "CORREO DOCENTE" -> "CORREO DOCENTE"
const normalizarTexto = v => String(v ?? '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/\s+/g, ' ').trim().toUpperCase()

const normalizarCorreo = v => String(v ?? '').trim().toLowerCase()
const correoValido = c => /^[a-z0-9._%+-]+@unal\.edu\.co$/.test(c)

// Lee una hoja como matriz de textos
function leerHoja(hoja) {
  return XLSX.utils.sheet_to_json(hoja, { header: 1, raw: false, defval: '', blankrows: false })
    .map(fila => fila.map(c => String(c ?? '').trim()))
}

// Busca la fila de encabezados (la primera que contiene todas las columnas pedidas)
function ubicarEncabezado(filas, requeridas, archivo) {
  for (let i = 0; i < Math.min(filas.length, 15); i++) {
    const norm = filas[i].map(normalizarTexto)
    const indices = requeridas.map(col => norm.indexOf(col))
    if (indices.every(ix => ix >= 0)) {
      return { fila: i, col: Object.fromEntries(requeridas.map((c, k) => [c, indices[k]])) }
    }
  }
  throw new Error(`${archivo}: no encontre los encabezados ${requeridas.join(', ')} en las primeras 15 filas`)
}

function abrirLibro(ruta) {
  return XLSX.read(fs.readFileSync(ruta), { type: 'buffer' })
}

function hojaPorNombre(libro, nombre) {
  const real = libro.SheetNames.find(n => normalizarTexto(n) === normalizarTexto(nombre))
  return real ? libro.Sheets[real] : null
}

// ---------------------------------------------------------------------------
// 1. Leer el manifiesto (grupos.xlsx)

function leerManifiesto(errores) {
  if (!fs.existsSync(MANIFIESTO)) {
    throw new Error(`No existe ${MANIFIESTO}. Crea el archivo con las hojas "grupos" y "directivos".`)
  }
  const libro = abrirLibro(MANIFIESTO)

  const hojaGrupos = hojaPorNombre(libro, 'grupos')
  if (!hojaGrupos) throw new Error('grupos.xlsx: falta la hoja "grupos"')
  const filas = leerHoja(hojaGrupos)
  const cols = ['ARCHIVO', 'CORREO DOCENTE', 'NOMBRE DOCENTE', 'ASIGNATURA', 'GRUPO']
  const { fila: f0, col } = ubicarEncabezado(filas, cols, 'grupos.xlsx (hoja grupos)')

  const grupos = []
  filas.slice(f0 + 1).forEach((fila, k) => {
    const n = f0 + k + 2 // numero de fila como lo ve Excel
    const g = {
      fila: n,
      archivo: fila[col['ARCHIVO']],
      docente: normalizarCorreo(fila[col['CORREO DOCENTE']]),
      nombre: fila[col['NOMBRE DOCENTE']],
      asignatura: fila[col['ASIGNATURA']],
      grupo: fila[col['GRUPO']]
    }
    if (!g.archivo && !g.docente) return // fila vacia
    if (!g.archivo) errores.push(`grupos.xlsx fila ${n}: falta ARCHIVO`)
    if (!correoValido(g.docente)) errores.push(`grupos.xlsx fila ${n}: CORREO DOCENTE invalido "${g.docente}" (debe ser ${DOMINIO})`)
    if (!g.nombre) errores.push(`grupos.xlsx fila ${n}: falta NOMBRE DOCENTE`)
    grupos.push(g)
  })

  const repetidos = grupos.map(g => g.archivo.toLowerCase()).filter((a, i, arr) => a && arr.indexOf(a) !== i)
  for (const a of new Set(repetidos)) errores.push(`grupos.xlsx: el archivo "${a}" aparece en mas de una fila`)

  const directivos = []
  const hojaDir = hojaPorNombre(libro, 'directivos')
  if (hojaDir) {
    const filasD = leerHoja(hojaDir)
    if (filasD.length) {
      const { fila: d0, col: cd } = ubicarEncabezado(filasD, ['CORREO', 'NOMBRE'], 'grupos.xlsx (hoja directivos)')
      filasD.slice(d0 + 1).forEach((fila, k) => {
        const correo = normalizarCorreo(fila[cd['CORREO']])
        if (!correo) return
        if (!correoValido(correo)) errores.push(`grupos.xlsx hoja directivos fila ${d0 + k + 2}: correo invalido "${correo}"`)
        directivos.push({ correo, nombre: fila[cd['NOMBRE']] })
      })
    }
  }
  return { grupos, directivos }
}

// ---------------------------------------------------------------------------
// 2. Leer una lista de clase

function leerLista(nombreArchivo, avisos) {
  const ruta = path.join(LISTAS, nombreArchivo)
  const libro = abrirLibro(ruta)
  const hoja = libro.Sheets[libro.SheetNames[0]]
  if (libro.SheetNames.length > 1) avisos.push(`${nombreArchivo}: tiene ${libro.SheetNames.length} hojas; solo se lee la primera ("${libro.SheetNames[0]}")`)

  const filas = leerHoja(hoja)
  const { fila: f0, col } = ubicarEncabezado(filas, ['CORREO'], nombreArchivo)

  const correos = new Set()
  const invalidos = []
  let repetidos = 0
  filas.slice(f0 + 1).forEach((fila, k) => {
    const crudo = fila[col['CORREO']]
    if (!crudo && fila.every(c => !c)) return // fila vacia
    const correo = normalizarCorreo(crudo)
    if (!correoValido(correo)) {
      invalidos.push({ fila: f0 + k + 2, valor: crudo })
      return
    }
    if (correos.has(correo)) repetidos++
    correos.add(correo)
  })
  return { correos, invalidos, repetidos }
}

// ---------------------------------------------------------------------------
// 3. Armar el plan

function armarPlan() {
  const errores = []
  const avisos = []
  const { grupos, directivos } = leerManifiesto(errores)

  if (!fs.existsSync(LISTAS)) throw new Error(`No existe la carpeta ${LISTAS}`)
  const enCarpeta = fs.readdirSync(LISTAS).filter(f => /\.xlsx?$/i.test(f) && !f.startsWith('~$'))
  const porMinuscula = new Map(enCarpeta.map(f => [f.toLowerCase(), f]))

  // Archivos sobrantes o faltantes
  const enManifiesto = new Set(grupos.map(g => g.archivo.toLowerCase()))
  for (const f of enCarpeta) {
    if (!enManifiesto.has(f.toLowerCase())) avisos.push(`El archivo "${f}" esta en listas/ pero no en grupos.xlsx: NO se cargara`)
  }

  const docentes = new Map()  // correo -> { nombre, asignaturas:Set, grupos:[], estudiantes: Map(correo -> etiqueta) }
  const detalle = []
  for (const g of grupos) {
    const real = porMinuscula.get(g.archivo.toLowerCase())
    if (!real) {
      errores.push(`grupos.xlsx fila ${g.fila}: no existe el archivo "${g.archivo}" en listas/`)
      continue
    }
    let lista
    try {
      lista = leerLista(real, avisos)
    } catch (e) {
      errores.push(e.message)
      continue
    }
    for (const inv of lista.invalidos) {
      errores.push(`${real} fila ${inv.fila}: correo invalido "${inv.valor}"`)
    }
    if (lista.repetidos) avisos.push(`${real}: ${lista.repetidos} correo(s) repetido(s) dentro del archivo (se cuentan una vez)`)
    if (lista.correos.size === 0) errores.push(`${real}: no tiene ningun correo valido`)

    const etiqueta = [g.asignatura, g.grupo ? `Grupo ${g.grupo}` : ''].filter(Boolean).join(' - ')
    if (!docentes.has(g.docente)) {
      docentes.set(g.docente, { nombre: g.nombre, asignaturas: new Set(), grupos: [], estudiantes: new Map() })
    }
    const d = docentes.get(g.docente)
    if (d.nombre !== g.nombre) avisos.push(`El docente ${g.docente} aparece con dos nombres: "${d.nombre}" y "${g.nombre}" (se usa el primero)`)
    if (g.asignatura) d.asignaturas.add(g.asignatura)
    d.grupos.push(etiqueta || real)
    for (const c of lista.correos) if (!d.estudiantes.has(c)) d.estudiantes.set(c, etiqueta)

    detalle.push({ archivo: real, docente: g.docente, etiqueta, estudiantes: lista.correos.size, invalidos: lista.invalidos.length })
  }

  // Cruces que conviene saber
  const correosDocentes = new Set(docentes.keys())
  const correosDirectivos = new Set(directivos.map(d => d.correo))
  const todosEstudiantes = new Map() // correo -> numero de docentes
  for (const d of docentes.values()) {
    for (const c of d.estudiantes.keys()) todosEstudiantes.set(c, (todosEstudiantes.get(c) || 0) + 1)
  }
  for (const c of todosEstudiantes.keys()) {
    if (correosDocentes.has(c) || correosDirectivos.has(c)) {
      errores.push(`${c} aparece como estudiante y tambien como docente/directivo: el padron le daria rol de docente/directivo`)
    }
  }
  for (const c of correosDirectivos) {
    if (correosDocentes.has(c)) errores.push(`${c} esta como directivo y como docente: elige un solo rol`)
  }
  const enVarios = [...todosEstudiantes.values()].filter(n => n > 1).length

  return { errores, avisos, docentes, directivos, detalle, totalEstudiantes: todosEstudiantes.size, enVarios }
}

function imprimirReporte(plan) {
  console.log('\n================ REPORTE DE LA CARGA ================\n')
  console.log('Grupos:')
  for (const g of plan.detalle) {
    const inv = g.invalidos ? `  (${g.invalidos} invalidos)` : ''
    console.log(`  ${String(g.estudiantes).padStart(4)} est.  ${g.etiqueta.padEnd(55).slice(0, 55)}  ${g.docente}${inv}`)
  }
  console.log('\nDocentes:')
  for (const [correo, d] of plan.docentes) {
    console.log(`  ${d.nombre}  <${correo}>  ${d.grupos.length} grupo(s), ${d.estudiantes.size} estudiantes`)
  }
  console.log(`\nDirectivos: ${plan.directivos.length ? plan.directivos.map(d => d.correo).join(', ') : '(ninguno)'}`)
  console.log(`Estudiantes distintos: ${plan.totalEstudiantes}` +
    (plan.enVarios ? `  (${plan.enVarios} estan en mas de un grupo/docente)` : ''))

  if (plan.avisos.length) {
    console.log(`\nAVISOS (${plan.avisos.length}):`)
    plan.avisos.forEach(a => console.log('  - ' + a))
  }
  if (plan.errores.length) {
    console.log(`\nERRORES (${plan.errores.length}) — corrigelos antes de aplicar:`)
    plan.errores.forEach(e => console.log('  x ' + e))
  }
}

// ---------------------------------------------------------------------------
// 4. Aplicar

async function asegurarIndices() {
  for (const modelo of [Teacher, Roster, Enrollment, Evaluation, Question, ImprovementPlan]) {
    try {
      await modelo.createIndexes()
    } catch (e) {
      console.log(`  ! No se pudo crear un indice de ${modelo.modelName}: ${e.message}`)
    }
  }
}

async function aplicar(plan) {
  console.log('\nCreando indices...')
  await asegurarIndices()

  let padron = 0
  for (const d of plan.directivos) {
    await Roster.updateOne(
      { email: d.correo },
      { $set: { role: 'directivo', name: d.nombre || '' } },
      { upsert: true }
    )
    padron++
  }

  let agregadas = 0, quitadas = 0
  for (const [correo, d] of plan.docentes) {
    const asignatura = [...d.asignaturas].join(' / ')
    await Roster.updateOne(
      { email: correo },
      { $set: { role: 'docente', name: d.nombre, subject: asignatura } },
      { upsert: true }
    )
    padron++
    await Teacher.updateOne(
      { id: correo },
      { $set: { name: d.nombre, subject: asignatura, enrolledStudents: d.estudiantes.size } },
      { upsert: true }
    )

    // Sincronizar inscripciones de este docente
    const deseadas = new Map([...d.estudiantes].map(([c, etiqueta]) => [hashEmail(c), etiqueta]))
    const actuales = await Enrollment.find({ teacherId: correo }).select('studentKey')
    const actualesSet = new Set(actuales.map(e => e.studentKey))

    const nuevas = [...deseadas].filter(([k]) => !actualesSet.has(k))
      .map(([studentKey, group]) => ({ studentKey, teacherId: correo, group }))
    const sobrantes = [...actualesSet].filter(k => !deseadas.has(k))

    if (nuevas.length) {
      await Enrollment.insertMany(nuevas, { ordered: false })
      agregadas += nuevas.length
    }
    if (sobrantes.length) {
      await Enrollment.deleteMany({ teacherId: correo, studentKey: { $in: sobrantes } })
      quitadas += sobrantes.length
    }
  }

  const docentesEnBase = await Teacher.find().select('id name')
  const fuera = docentesEnBase.filter(t => !plan.docentes.has(t.id))

  console.log('\nRESULTADO')
  console.log(`  Padron (docentes + directivos) actualizado: ${padron}`)
  console.log(`  Docentes actualizados: ${plan.docentes.size}`)
  console.log(`  Inscripciones agregadas: ${agregadas}   quitadas: ${quitadas}`)
  console.log(`  Inscripciones totales en la base: ${await Enrollment.countDocuments()}`)
  if (fuera.length) {
    console.log(`  Ojo: hay ${fuera.length} docente(s) en la base que no estan en grupos.xlsx (no se tocaron):`)
    fuera.forEach(t => console.log(`    - ${t.name} <${t.id}>`))
  }
}

// ---------------------------------------------------------------------------

async function main() {
  console.log(`Huella del secreto: ${huellaSecreto()}  (debe coincidir con /api/health del servidor)`)
  const base = (process.env.MONGODB_URI || '').split('/').pop()?.split('?')[0] || '(sin MONGODB_URI)'
  console.log(`Base de datos destino: ${base}`)
  console.log(APLICAR ? 'Modo: APLICAR (se escribira en la base)' : 'Modo: REVISION (no se escribe nada)')

  const plan = armarPlan()
  imprimirReporte(plan)

  if (!APLICAR) {
    console.log(plan.errores.length
      ? '\nHay errores. Corrigelos y vuelve a revisar.'
      : '\nTodo en orden. Para escribir en la base: npm run piloto:cargar -- --aplicar')
    return
  }
  if (plan.errores.length) {
    console.log('\nNo se aplico nada porque hay errores.')
    process.exitCode = 1
    return
  }

  await mongoose.connect(process.env.MONGODB_URI)
  try {
    await aplicar(plan)
  } finally {
    await mongoose.connection.close()
  }
  console.log('\nListo')
}

main().catch(async err => {
  console.error('\nError:', err.message)
  await mongoose.connection.close().catch(() => {})
  process.exit(1)
})
