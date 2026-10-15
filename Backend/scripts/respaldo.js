// Copia de seguridad: exporta las colecciones a archivos JSON.
// Uso:  npm run piloto:respaldo
// Crea Backend/respaldos/AAAA-MM-DD_HH-MM/ (esa carpeta NO se sube a git).

import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import mongoose from 'mongoose'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const COLECCIONES = ['evaluations', 'enrollments', 'teachers', 'rosters', 'improvementplans', 'questions']

const ahora = new Date()
const sello = ahora.toISOString().slice(0, 16).replace('T', '_').replace(':', '-')
const destino = path.join(__dirname, '..', 'respaldos', sello)
fs.mkdirSync(destino, { recursive: true })

await mongoose.connect(process.env.MONGODB_URI)
try {
  const db = mongoose.connection.db
  for (const nombre of COLECCIONES) {
    const docs = await db.collection(nombre).find().toArray()
    fs.writeFileSync(path.join(destino, `${nombre}.json`), JSON.stringify(docs, null, 1))
    console.log(`  ${nombre.padEnd(18)} ${docs.length}`)
  }
  console.log(`\nRespaldo guardado en ${destino}`)
} finally {
  await mongoose.connection.close()
}
