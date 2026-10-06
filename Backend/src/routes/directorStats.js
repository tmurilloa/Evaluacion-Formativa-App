import express from 'express'
import Teacher from '../models/Teacher.js'
import Evaluation from '../models/Evaluation.js'
import Question from '../models/Question.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const router = express.Router()

// Orden pedagogico fijo de las categorias (para graficas y tablas estables)
const CATEGORY_ORDER = [
  'Carácter docente',
  'Competencias pedagógicas',
  'Dominio disciplinar',
  'Contexto',
  'Producción de conocimiento pedagógico'
]

const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0)
const round2 = (n) => parseFloat(n.toFixed(2))

// Scores likert (1-5) de una evaluacion para una lista de numeros de pregunta
function scoresFor(evaluation, questionNumbers) {
  const scores = evaluation.evaluationData?.scores
  if (!scores) return []
  return questionNumbers
    .map(n => scores.get(String(n)))
    .filter(v => typeof v === 'number' && v > 0)
}

// GET /api/director-stats - Estadisticas generales para el directivo
router.get('/', requireAuth, requireRole('directivo'), async (req, res) => {
  try {
    const teachers = await Teacher.find()
    const evaluations = await Evaluation.find({ status: { $ne: 'draft' } })
    const teacherQuestions = await Question.find({ type: 'teacher' })
    const studentQuestions = await Question.find({ type: 'student' })

    const teacherLikert = teacherQuestions.filter(q => q.questionType === 'likert')
    const studentLikert = studentQuestions.filter(q => q.questionType === 'likert')
    const teacherLikertNums = teacherLikert.map(q => q.number)
    const studentLikertNums = studentLikert.map(q => q.number)

    // categoria -> [numeros de pregunta], por banco
    const teacherNumsByCategory = {}
    teacherLikert.forEach(q => {
      if (!q.category) return
      if (!teacherNumsByCategory[q.category]) teacherNumsByCategory[q.category] = []
      teacherNumsByCategory[q.category].push(q.number)
    })
    const studentNumsByCategory = {}
    studentLikert.forEach(q => {
      if (!q.category) return
      if (!studentNumsByCategory[q.category]) studentNumsByCategory[q.category] = []
      studentNumsByCategory[q.category].push(q.number)
    })

    // Categorias presentes, en el orden fijo primero y luego cualquier extra
    const known = CATEGORY_ORDER.filter(c => teacherNumsByCategory[c] || studentNumsByCategory[c])
    const extra = Object.keys({ ...teacherNumsByCategory, ...studentNumsByCategory })
      .filter(c => !CATEGORY_ORDER.includes(c))
    const categories = [...known, ...extra]

    const teacherOpen = teacherQuestions.filter(q => q.questionType === 'abierta')
    const studentOpen = studentQuestions.filter(q => q.questionType === 'abierta')

    const stats = {
      totalTeachers: teachers.length,
      totalEvaluations: evaluations.length,
      selfEvaluations: evaluations.filter(e => e.userRole === 'docente').length,
      studentEvaluations: evaluations.filter(e => e.userRole === 'estudiante').length,
      teachers: [],
      overallAverage: 0,
      categories,
      categoryAveragesStudent: {}, // percepcion estudiantil institucional por categoria
      categoryAveragesSelf: {},    // autoevaluacion institucional por categoria
      categoryAverages: {},        // alias = estudiantil (compatibilidad con el radar actual)
      scoreDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } // distribucion institucional (estudiantes)
    }

    // Acumuladores institucionales por categoria
    const instStudentByCat = {}
    const instSelfByCat = {}
    categories.forEach(c => { instStudentByCat[c] = []; instSelfByCat[c] = [] })

    teachers.forEach(teacher => {
      const teacherEvals = evaluations.filter(e => e.teacherId === teacher.id)
      const selfEval = teacherEvals.find(e => e.userRole === 'docente')
      const studentEvals = teacherEvals.filter(e => e.userRole === 'estudiante')

      const selfAllScores = selfEval ? scoresFor(selfEval, teacherLikertNums) : []
      const studentAllScores = studentEvals.flatMap(e => scoresFor(e, studentLikertNums))
      const selfAverage = round2(avg(selfAllScores))
      const studentAverage = round2(avg(studentAllScores))
      const overallAverage = studentAverage // el promedio general refleja la percepcion estudiantil

      // Distribucion de puntajes del docente (estudiantes) + acumular institucional
      const studentScoreDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      studentAllScores.forEach(v => {
        studentScoreDistribution[v] = (studentScoreDistribution[v] || 0) + 1
        stats.scoreDistribution[v] = (stats.scoreDistribution[v] || 0) + 1
      })

      // Promedios por categoria (self y student) del docente + acumular institucional
      const categoryScores = categories.map(category => {
        const selfScores = selfEval ? scoresFor(selfEval, teacherNumsByCategory[category] || []) : []
        const studentScores = studentEvals.flatMap(e => scoresFor(e, studentNumsByCategory[category] || []))
        instSelfByCat[category].push(...selfScores)
        instStudentByCat[category].push(...studentScores)
        const self = round2(avg(selfScores))
        const student = round2(avg(studentScores))
        return { category, self, student, gap: round2(student - self) }
      })

      const selfOpenAnswers = selfEval
        ? teacherOpen.map(q => ({
            question: q.question,
            answer: selfEval.evaluationData?.openAnswers?.get(String(q.number)) || ''
          })).filter(a => a.answer)
        : []

      const studentOpenAnswers = studentOpen.map(q => ({
        question: q.question,
        answers: studentEvals
          .map(e => e.evaluationData?.openAnswers?.get(String(q.number)))
          .filter(a => a && a.trim())
      })).filter(a => a.answers.length > 0)

      stats.teachers.push({
        id: teacher.id,
        name: teacher.name,
        enrolledStudents: teacher.enrolledStudents || 0,
        selfAverage,
        studentAverage,
        overallAverage,
        studentEvaluationCount: studentEvals.length,
        hasSelfEvaluation: !!selfEval,
        categoryScores,
        studentScoreDistribution,
        selfOpenAnswers,
        studentOpenAnswers
      })
    })

    // Promedio general institucional (promedio de los promedios estudiantiles validos)
    const validAverages = stats.teachers.map(t => t.overallAverage).filter(a => a > 0)
    stats.overallAverage = round2(avg(validAverages))

    // Promedios institucionales por categoria
    categories.forEach(category => {
      if (instStudentByCat[category].length) {
        stats.categoryAveragesStudent[category] = round2(avg(instStudentByCat[category]))
      }
      if (instSelfByCat[category].length) {
        stats.categoryAveragesSelf[category] = round2(avg(instSelfByCat[category]))
      }
    })
    stats.categoryAverages = { ...stats.categoryAveragesStudent } // el radar actual sigue funcionando

    res.status(200).json(stats)
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener estadísticas', error: error.message })
  }
})

export default router