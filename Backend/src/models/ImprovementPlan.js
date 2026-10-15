import mongoose from 'mongoose'

const improvementPlanSchema = new mongoose.Schema({
    teacherId: {
        type: String,
        // Obligatorio solo en la retroalimentacion individual
        required: function () { return this.scope !== 'colectiva' }
    },
    // Destinatarios de una retroalimentacion colectiva de la direccion
    teacherIds: {
        type: [String],
        default: undefined
    },
    scope: {
        type: String,
        enum: ['individual', 'colectiva'],
        default: 'individual'
    },
    userEmail: {
        type: String,
        required: true
    },
    goal: {
        type: String,
        required: true
    },
    actions: {
        type: String,
        required: true
    },
    indicators: {
        type: String,
        required: true
    },
    deadline: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        enum: ['activo', 'completado'],
        default: 'activo'
    },
    period: {
        type: String,
        default: ''
    },
    comments: {
        type: String,
        default: ''
    },
    authorRole: {
        type: String,
        enum: ['docente', 'directivo'],
        default: 'docente'
    }
}, {timestamps: true})

improvementPlanSchema.index({ teacherIds: 1 })

export default mongoose.model('ImprovementPlan', improvementPlanSchema)