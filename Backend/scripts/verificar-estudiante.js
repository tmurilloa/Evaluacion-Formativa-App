// Soporte el dia del piloto: "no me aparece mi profesor".
// Uso:  npm run piloto:verificar -- correo@unal.edu.co
// Dice si ese correo esta inscrito, con que docentes, y en que va su evaluacion.

import 'dotenv/config'
import mongoose from 'mongoose'
import Enrollment from '../src/models/Enrollment.js'
import Teacher from '../src/models/Teacher.js'
import Roster from '../src/models/Roster.js'
import Evaluation from '../src/models/Evaluation.js'
import { hashEmail } from '../src/utils/anon.js'

const correo = (process.argv[2] || '').trim().toLowerCase()
if (!correo.includes('@')) {
  console.log('Uso: npm run piloto:verificar -- correo@unal.edu.co')
  process.exit(1)
}

await mongoose.connect(process.env.MONGODB_URI)
try {
  const clave = hashEmail(correo)
  const enPadron = await Roster.findOne({ email: correo })
  console.log(`\n${correo}`)
  console.log(`  Rol: ${enPadron ? enPadron.role + ' (padron)' : 'estudiante'}`)

  const inscripciones = await Enrollment.find({ studentKey: clave })
  if (!inscripciones.length) {
    console.log('  NO esta inscrito con ningun docente.')
    console.log('  Revisa si ese correo aparece en alguna lista de piloto/listas/ (puede estar mal escrito,')
    console.log('  o el estudiante entro con otra cuenta de Google).')
  }
  for (const ins of inscripciones) {
    const docente = await Teacher.findOne({ id: ins.teacherId })
    const ev = await Evaluation.findOne({ evaluatorKey: clave, teacherId: ins.teacherId, userRole: 'estudiante' })
    const estado = !ev ? 'sin empezar'
      : ev.status === 'submitted' ? 'ENVIADA'
      : `borrador (${ev.evaluationData?.scores?.size || 0} respuestas de escala)`
    console.log(`  - ${docente?.name || ins.teacherId}  [${ins.group}]  ->  ${estado}`)
  }
} finally {
  await mongoose.connection.close()
}
