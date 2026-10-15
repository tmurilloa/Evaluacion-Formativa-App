import mongoose from 'mongoose'

// Inscripcion de un estudiante con un docente (de las listas de clase).
// Por privacidad NO se guarda el correo del estudiante: se guarda su codigo
// anonimo (el mismo hashEmail que usan las evaluaciones). Asi la base nunca
// contiene la lista de estudiantes en claro.
const enrollmentSchema = new mongoose.Schema({
    studentKey: { type: String, required: true },   // hashEmail(correo del estudiante)
    teacherId:  { type: String, required: true },   // Teacher.id (correo del docente)
    group:      { type: String, default: '' }       // etiqueta del grupo, p. ej. "FPI Grupo 3"
}, { timestamps: true })

enrollmentSchema.index({ studentKey: 1, teacherId: 1 }, { unique: true })
enrollmentSchema.index({ teacherId: 1 })

export default mongoose.model('Enrollment', enrollmentSchema)
