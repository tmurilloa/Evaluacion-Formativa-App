import express from 'express'
import Evaluation from '../models/Evaluation.js'
import Question from '../models/Question.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { hashEmail } from '../utils/anon.js'
const router = express.Router()


// GET /api/evaluations/student - Progreso del estudiante autenticado por profesor (incluye borradores en curso)
router.get('/student', requireAuth, requireRole('estudiante'), async (req, res) => {
  try {
    const clave = hashEmail(req.userEmail)

    const evaluations = await Evaluation.find({ evaluatorKey: clave, userRole: 'estudiante' })
    const progress = {}
    evaluations.forEach(e => {
      progress[e.teacherId] = {
        status: e.status,
        scores: Object.fromEntries(e.evaluationData?.scores || []),
        openAnswers: Object.fromEntries(e.evaluationData?.openAnswers || [])
      }
    })
    res.status(200).json({ progress })
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener las evaluaciones', error: error.message })
  }
})

// GET /api/evaluations/teacher-results - Resultados del docente autenticado
router.get('/teacher-results', requireAuth, requireRole('docente', 'directivo'), async (req, res) => {
  try {
    const teacherId = req.userEmail

    const selfEvaluation = await Evaluation.findOne({ teacherId, userRole: 'docente', status: { $ne: 'draft' } }).select('-evaluatorKey')
    const studentEvaluations = await Evaluation.find({ teacherId, userRole: 'estudiante', status: { $ne: 'draft' } }).select('-evaluatorKey')
    const hasData = !!selfEvaluation || studentEvaluations.length > 0

    res.status(200).json({ hasData, selfEvaluation, studentEvaluations })
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener los resultados', error: error.message })
  }
})

// GET /api/evaluations/teacher-self-check - Verificar si el docente autenticado ya se autoevaluó
router.get('/teacher-self-check', requireAuth, requireRole('docente'), async (req, res) => {
  try {
    const teacherId = req.userEmail

    const selfEvaluation = await Evaluation.findOne({ teacherId, userRole: 'docente', status: { $ne: 'draft' } })
    res.status(200).json({ hasEvaluated: !!selfEvaluation })
  } catch (error) {
    res.status(500).json({ message: 'Error al verificar la autoevaluación', error: error.message })
  }
})

// POST /api/evaluations/submit - Autoevaluación docente (un solo paso)
router.post('/submit', requireAuth, requireRole('docente'), async (req, res) => {
  try {
    const { evaluationData } = req.body

    // Un docente solo puede autoevaluarse a sí mismo: identidad y rol salen del token.
    const teacherId = req.userEmail
    const userRole = 'docente'

    if (!evaluationData) {
      return res.status(400).json({ message: 'Datos incompletos' })
    }

    const evaluation = await Evaluation.create({ teacherId, evaluationData, evaluatorKey: hashEmail(req.userEmail), userRole, status: 'submitted' })
    res.status(201).json({ message: 'Evaluación enviada correctamente', id: evaluation._id })
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Ya existe una evaluación para este docente' })
    }
    res.status(500).json({ message: 'Error al enviar la evaluación', error: error.message })
  }
})

// PATCH /api/evaluations/answer - Autoguardar la respuesta de una pregunta para un profesor (flujo estudiantil)
router.patch('/answer', requireAuth, requireRole('estudiante'), async (req, res) => {
  try {
    const { teacherId, questionNumber, questionType, value } = req.body
    const clave = hashEmail(req.userEmail)
    const userRole = 'estudiante'

    if (!teacherId || !Number.isInteger(questionNumber) || questionNumber <= 0) {
      return res.status(400).json({ message: 'Datos incompletos o inválidos' })
    }
    if (!['likert', 'abierta'].includes(questionType)) {
      return res.status(400).json({ message: 'Tipo de pregunta inválido' })
    }
    if (questionType === 'likert' && (!Number.isInteger(value) || value < 1 || value > 5)) {
      return res.status(400).json({ message: 'El valor de una pregunta likert debe ser un entero entre 1 y 5' })
    }
    const existing = await Evaluation.findOne({ evaluatorKey: clave, teacherId, userRole })
    if (existing && existing.status === 'submitted') {
      return res.status(409).json({ message: 'Esta evaluación ya fue enviada y no se puede editar' })
    }

    const field = questionType === 'likert' ? 'scores' : 'openAnswers'
    const evaluation = await Evaluation.findOneAndUpdate(
      { evaluatorKey: clave, teacherId, userRole },
      {
        $set: { [`evaluationData.${field}.${questionNumber}`]: value, status: 'draft' },
        $setOnInsert: { teacherId, evaluatorKey: clave, userRole }
      },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    )

    res.status(200).json({ message: 'Respuesta guardada', status: evaluation.status })
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Ya existe una evaluación para este docente' })
    }
    res.status(500).json({ message: 'Error al guardar la respuesta', error: error.message })
  }
})

// POST /api/evaluations/finalize - Marcar como enviada la evaluación en borrador de un profesor (flujo estudiantil)
router.post('/finalize', requireAuth, requireRole('estudiante'), async (req, res) => {
  try {
    const { teacherId } = req.body
    const clave = hashEmail(req.userEmail)
    const userRole = 'estudiante'

    if (!teacherId) {
      return res.status(400).json({ message: 'Datos incompletos' })
    }
    
    const evaluation = await Evaluation.findOne({ evaluatorKey: clave, teacherId, userRole })
    if (!evaluation) {
      return res.status(404).json({ message: 'No hay respuestas guardadas para este docente' })
    }
    if (evaluation.status === 'submitted') {
      return res.status(409).json({ message: 'Esta evaluación ya fue enviada' })
    }

    const questions = await Question.find({ type: 'student' })
    const missing = questions
      .filter(q => {
        if (q.questionType === 'likert') {
          return !evaluation.evaluationData?.scores?.has(String(q.number))
        }
        return !evaluation.evaluationData?.openAnswers?.get(String(q.number))?.trim()
      })
      .map(q => q.number)

    if (missing.length > 0) {
      return res.status(400).json({ message: 'Faltan preguntas por responder', missing })
    }

    evaluation.status = 'submitted'
    await evaluation.save()
    res.status(200).json({ message: 'Evaluación enviada correctamente', id: evaluation._id })
  } catch (error) {
    res.status(500).json({ message: 'Error al finalizar la evaluación', error: error.message })
  }
})

export default router