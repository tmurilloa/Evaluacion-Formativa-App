import mongoose from 'mongoose'

const teacherSchema = new mongoose.Schema({
    id: {
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true
    },
    subject: {
        type: String,
        default: ''
    },
    enrolledStudents: {
        type: Number,
        default: 0,     // 0 = desconocido; se cae al minimo absoluto
        min: 0
    }
}, {timestamps: true})

export default mongoose.model('Teacher', teacherSchema)