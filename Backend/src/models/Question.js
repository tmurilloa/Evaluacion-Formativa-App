import mongoose from "mongoose"

const questionSchema = new mongoose.Schema({
    number: { //Se pone Numero para señalar el numero de la pregunta y evitar conflicto con _id
        type: Number,
        required: true
    },
    question: {
        type: String,
        required: true
    },
    category: {
        type: String,
        enum: ['Carácter docente', 'Competencias pedagógicas', 'Dominio disciplinar', 'Contexto', 'Producción de conocimiento pedagógico'],
        required: true
    },
    type: {
        type: String,
        enum: ['teacher', 'student'], // Se separa preguntas por cuestionario de profesores y estudiantes
        required: true
    },
    questionType: {
        type: String,
        enum: ['likert', 'abierta'],
        default: 'likert',
        required: true
    }
}, {timestamps: true})

export default mongoose.model('Question', questionSchema)