import express from 'express'
import ImprovementPlan from '../models/ImprovementPlan.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const router = express.Router()

// GET /api/improvement-plans - Obtener planes de mejora del docente autenticado
router.get('/', requireAuth, requireRole('docente', 'directivo'), async (req, res) => {
  try {
    const teacherId = req.userEmail

    const plans = await ImprovementPlan.find({ teacherId, authorRole: { $ne: 'directivo' } }).sort({ createdAt: -1 })
    res.status(200).json({ plans, count: plans.length })
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener los planes de mejora', error: error.message })
  }
})

// POST /api/improvement-plans - Guardar un plan de mejora
router.post('/', requireAuth, requireRole('docente'), async (req, res) => {
  try {
    const { goal, actions, indicators, deadline } = req.body
    const teacherId = req.userEmail
    const userEmail = req.userEmail

    if (!goal || !actions || !indicators || !deadline) {
      return res.status(400).json({ message: 'Datos incompletos' })
    }

    const plan = await ImprovementPlan.create({ teacherId, goal, actions, indicators, deadline, userEmail })
    res.status(201).json({ message: 'Plan de mejora guardado correctamente', plan })
  } catch (error) {
    res.status(500).json({ message: 'Error al guardar el plan de mejora', error: error.message })
  }
})

// PATCH /api/improvement-plans/:id - Marcar un plan como completado
router.patch('/:id', requireAuth, requireRole('docente'), async (req, res) => {
  try {
    const { id } = req.params
    const teacherId = req.userEmail

    const plan = await ImprovementPlan.findOne({ _id: id, teacherId, authorRole: { $ne: 'directivo' } })
    if (!plan) {
      return res.status(404).json({ message: 'Plan de mejora no encontrado' })
    }

    plan.status = 'completado'
    await plan.save()

    res.status(200).json({ message: 'Plan marcado como completado', plan })
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar el plan de mejora', error: error.message })
  }
})

// DELETE /api/improvement-plans/:id - Eliminar un plan de mejora
router.delete('/:id', requireAuth, requireRole('docente'), async (req, res) => {
  try {
    const { id } = req.params
    const teacherId = req.userEmail

    const plan = await ImprovementPlan.findOneAndDelete({ _id: id, teacherId, authorRole: { $ne: 'directivo' } })
    if (!plan) {
      return res.status(404).json({ message: 'Plan de mejora no encontrado' })
    }

    res.status(200).json({ message: 'Plan de mejora eliminado correctamente' })
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar el plan de mejora', error: error.message })
  }
})

// GET /api/improvement-plans/teacher/:teacherId - Retroalimentacion de un docente (directivo)
router.get('/teacher/:teacherId', requireAuth, requireRole('directivo'), async (req, res) => {
  try {
    const { teacherId } = req.params
    const plans = await ImprovementPlan.find({ teacherId, authorRole: 'directivo' }).sort({ createdAt: -1 })
    res.status(200).json({ plans, count: plans.length })
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener la retroalimentación', error: error.message })
  }
})

// POST /api/improvement-plans/teacher/:teacherId - Crear retroalimentacion para un docente (directivo)
router.post('/teacher/:teacherId', requireAuth, requireRole('directivo'), async (req, res) => {
  try {
    const { teacherId } = req.params
    const { goal, actions, indicators, deadline, period, comments } = req.body

    if (!goal || !actions || !indicators || !deadline || !period) {
      return res.status(400).json({ message: 'Faltan datos: meta, acciones, indicadores, fecha límite y periodo son obligatorios' })
    }

    const plan = await ImprovementPlan.create({
      teacherId,
      userEmail: req.userEmail,   // el directivo que la escribe
      goal, actions, indicators, deadline,
      period,
      comments: comments || '',
      authorRole: 'directivo'
    })
    res.status(201).json({ message: 'Retroalimentación guardada correctamente', plan })
  } catch (error) {
    res.status(500).json({ message: 'Error al guardar la retroalimentación', error: error.message })
  }
})
// GET /api/improvement-plans/from-director - Retroalimentacion que la direccion dejo al docente autenticado (solo lectura)
router.get('/from-director', requireAuth, requireRole('docente'), async (req, res) => {
  try {
    const teacherId = req.userEmail
    const plans = await ImprovementPlan.find({ teacherId, authorRole: 'directivo' }).sort({ createdAt: -1 })
    res.status(200).json({ plans, count: plans.length })
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener la retroalimentación', error: error.message })
  }
})
export default router