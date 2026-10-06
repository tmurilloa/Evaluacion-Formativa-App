import mongoose from 'mongoose'

// Padrón institucional: aca se definen qué correos son docentes o directivos.
// Cualquier correo @unal.edu.co que NO esté aquí se va a tratar como estudiante.
const rosterSchema = new mongoose.Schema({
    email:   { type: String, required: true, unique: true, lowercase: true, trim: true },
    role:    { type: String, enum: ['docente', 'directivo'], required: true },
    name:    { type: String, default: '' },     // requerido para docentes
    subject: { type: String, default: '' }      // materia del docente
}, { timestamps: true })

export default mongoose.model('Roster', rosterSchema)