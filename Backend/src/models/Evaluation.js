import mongoose from "mongoose"

const evaluationSchema = mongoose.Schema({
    teacherId: {
        type: String,
        required: true
    },
    evaluatorKey: {
        type: String,
        required: true
    },
    userRole: {
        type: String,
        enum: ['docente', 'estudiante'], // Solo acepta evaluacion de estas dos roles
        required: true
    },
    evaluationData: {
        scores: {
            type: Map, // Map de cada pregunta con su respuesta: "1": 4, "2": 3, ...
            of: { type: Number, min: 1, max: 5 }
        },
        openAnswers: {
            type: Map, // Map de cada pregunta abierta con su respuesta de texto
            of: String
        }
    },
    status: {
        type: String,
        enum: ['draft', 'submitted'], // draft: autoguardado en progreso; submitted: evaluacion completa y enviada
        default: 'submitted' // los documentos legacy (sin este campo) y los envios de un solo paso (autoevaluacion docente) se consideran ya enviados
    }
}, {timestamps: true})

evaluationSchema.index({ evaluatorKey: 1, teacherId: 1, userRole: 1 }, { unique: true })

export default mongoose.model('Evaluation', evaluationSchema)