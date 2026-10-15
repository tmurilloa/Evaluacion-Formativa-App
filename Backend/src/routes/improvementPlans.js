import express from 'express'
import ImprovementPlan from '../models/ImprovementPlan.js'
import Teacher from '../models/Teacher.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const router = express.Router()

// Retroalimentacion de la direccion que le llega a un docente: la individual
// (teacherId) y las colectivas donde aparece en la lista (teacherIds).
const filtroDireccion = (teacherId) => ({
  authorRole: 'directivo',
  $or: [{ teacherId }, { teacherIds: teacherId }]
})

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
    const plans = await ImprovementPlan.find(filtroDireccion(teacherId)).sort({ createdAt: -1 })
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
      scope: 'individual',
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
    const plans = await ImprovementPlan.find(filtroDireccion(teacherId))
      .select('-teacherIds')      // el docente no ve con quien se agrupo
      .sort({ createdAt: -1 })
    res.status(200).json({ plans, count: plans.length })
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener la retroalimentación', error: error.message })
  }
})
// GET /api/improvement-plans/group - Historial de retroalimentaciones colectivas (directivo)
router.get('/group', requireAuth, requireRole('directivo'), async (req, res) => {
  try {
    const plans = await ImprovementPlan.find({ authorRole: 'directivo', scope: 'colectiva' })
      .sort({ createdAt: -1 })
    res.status(200).json({ plans, count: plans.length })
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener las retroalimentaciones colectivas', error: error.message })
  }
})

// POST /api/improvement-plans/group - Crear una retroalimentacion colectiva (directivo)
router.post('/group', requireAuth, requireRole('directivo'), async (req, res) => {
  try {
    const { teacherIds, goal, actions, indicators, deadline, period, comments } = req.body

    if (!Array.isArray(teacherIds)) {
      return res.status(400).json({ message: 'teacherIds debe ser una lista' })
    }
    // Normalizar y quitar repetidos ANTES de contar
    const ids = [...new Set(teacherIds.map(id => String(id).trim().toLowerCase()))]
    if (ids.length < 2) {
      return res.status(400).json({ message: 'Una retroalimentación colectiva necesita al menos dos docentes' })
    }
    if (!goal || !actions || !indicators || !deadline || !period) {
      return res.status(400).json({ message: 'Faltan datos: meta, acciones, indicadores, fecha límite y periodo son obligatorios' })
    }

    const existentes = await Teacher.countDocuments({ id: { $in: ids } })
    if (existentes !== ids.length) {
      return res.status(400).json({ message: 'Uno o más de los docentes seleccionados no existen' })
    }

    const plan = await ImprovementPlan.create({
      scope: 'colectiva',
      teacherIds: ids,
      userEmail: req.userEmail,
      goal, actions, indicators, deadline, period,
      comments: comments || '',
      authorRole: 'directivo'
    })
    res.status(201).json({ message: 'Retroalimentación colectiva guardada', plan })
  } catch (error) {
    res.status(500).json({ message: 'Error al guardar la retroalimentación colectiva', error: error.message })
  }
})
export default router