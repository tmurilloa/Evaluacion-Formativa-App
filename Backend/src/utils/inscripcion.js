import Enrollment from '../models/Enrollment.js'
import { hashEmail } from './anon.js'

// Si es true, cada estudiante solo ve y solo puede evaluar a los docentes
// con los que aparece inscrito (cargados con npm run piloto:cargar).
// Por defecto se activa en produccion y se desactiva en desarrollo, para que
// la demo local siga funcionando sin listas de clase.
// Se puede forzar con la variable INSCRIPCION_OBLIGATORIA=true|false.
export function inscripcionObligatoria() {
  const valor = process.env.INSCRIPCION_OBLIGATORIA
  if (valor === 'true') return true
  if (valor === 'false') return false
  return process.env.NODE_ENV === 'production'
}

export async function docentesInscritos(email) {
  const inscripciones = await Enrollment.find({ studentKey: hashEmail(email) }).select('teacherId')
  return inscripciones.map(i => i.teacherId)
}

export async function estaInscrito(email, teacherId) {
  if (!inscripcionObligatoria()) return true
  return !!(await Enrollment.exists({ studentKey: hashEmail(email), teacherId }))
}
