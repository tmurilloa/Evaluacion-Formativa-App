import express from 'express'
import Teacher from '../models/Teacher.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const router = express.Router()

// GET /api/teachers/me - Obtener los datos del docente autenticado
router.get('/me', requireAuth, requireRole('docente'), async (req, res) => {
  try {
    const teacher = await Teacher.findOne({ id: req.userEmail?.toLowerCase() })
    if (!teacher) {
      return res.status(404).json({ message: 'Docente no encontrado' })
    }
    res.status(200).json(teacher)
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener el docente', error: error.message })
  }
})

// GET /api/teachers - Obtener todos los docentes
router.get('/', requireAuth, requireRole('estudiante', 'docente', 'directivo'), async (req, res) => {
  try {
    const teachers = await Teacher.find()
    res.status(200).json(teachers)
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener los docentes', error: error.message })
  }
})

// POST /api/teachers - Agregar un nuevo docente
router.post('/', requireAuth, requireRole('directivo', 'docente'), async (req, res) => {
  try {
    const { name, subject, enrolledStudents } = req.body
    const id = req.body.id?.trim().toLowerCase()

    if (!id || !name) {
      return res.status(400).json({ message: 'ID y nombre son requeridos' })
    }

    const existingTeacher = await Teacher.findOne({ id })
    if (existingTeacher) {
      return res.status(409).json({ message: 'El docente ya existe' })
    }

    const teacher = await Teacher.create({ id, name, subject, enrolledStudents })
    res.status(201).json({ message: 'Docente agregado correctamente', teacher })
  } catch (error) {
    res.status(500).json({ message: 'Error al agregar el docente', error: error.message })
  }
})

// PATCH /api/teachers/:id - Actualizar el numero de matriculados (directivo)
router.patch('/:id', requireAuth, requireRole('directivo'), async (req, res) => {
  try {
    const { enrolledStudents } = req.body

    if (typeof enrolledStudents !== 'number' || enrolledStudents < 0) {
      return res.status(400).json({ message: 'enrolledStudents debe ser un número no negativo' })
    }

    const teacher = await Teacher.findOneAndUpdate(
      { id: req.params.id },
      { enrolledStudents },
      { new: true }
    )
    if (!teacher) {
      return res.status(404).json({ message: 'Docente no encontrado' })
    }

    res.status(200).json({ message: 'Matriculados actualizado', teacher })
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar el docente', error: error.message })
  }
})

export default router