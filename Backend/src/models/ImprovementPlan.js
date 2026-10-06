import mongoose from 'mongoose'

const improvementPlanSchema = new mongoose.Schema({
    teacherId: {
        type: String,
        required: true
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

export default mongoose.model('ImprovementPlan', improvementPlanSchema)