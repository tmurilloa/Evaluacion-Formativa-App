import mongoose from 'mongoose'
import dotenv from 'dotenv'
import Teacher from '../src/models/Teacher.js'

dotenv.config()

// id del docente (su correo) -> numero de estudiantes matriculados
const MATRICULADOS = {
    'demo.docente1+clerk_test@unal.edu.co': 25,
    'demo.docente2+clerk_test@unal.edu.co': 20,
    'demo.docente3+clerk_test@unal.edu.co': 40,
    'demo.docente4+clerk_test@unal.edu.co': 15,
    'demo.docente5+clerk_test@unal.edu.co': 8,
}

async function run() {
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('Conectado a MongoDB\n')

    for (const [id, cantidad] of Object.entries(MATRICULADOS)) {
        const teacher = await Teacher.findOneAndUpdate(
            { id: id.toLowerCase() },
            { enrolledStudents: cantidad },
            { new: true }
    )
    console.log(teacher
        ? `  OK  ${teacher.name}: ${cantidad} matriculados`
        : `  --  NO ENCONTRADO: ${id}`)
    }

    console.log('\nEstado actual de la coleccion:')
    const todos = await Teacher.find().select('id name enrolledStudents')
    todos.forEach(t => console.log(`  ${t.name} (${t.id}): ${t.enrolledStudents ?? 'sin dato'}`))

    await mongoose.connection.close()
}

run().catch(err => { console.error('Error:', err.message); process.exit(1) })