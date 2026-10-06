import { useState, useEffect } from 'react'
import api from '../api/axios.js'

export function useTeacherData(teacherId) {
  const [questions, setQuestions] = useState([])
  const [studentQuestions, setStudentQuestions] = useState([])
  const [results, setResults] = useState(null)
  const [plans, setPlans] = useState([])
  const [teacherInfo, setTeacherInfo] = useState(null)
  const [directorFeedback, setDirectorFeedback] = useState([])
  const [hasEvaluated, setHasEvaluated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!teacherId) return
    loadData()
  }, [teacherId])

  const loadData = async () => {
    setLoading(true)
    setError('')
    try {
      const [questionsRes, studentQuestionsRes, selfCheckRes, teacherInfoRes] = await Promise.all([
        api.get('/api/questions?type=teacher'),
        api.get('/api/questions?type=student'),
        api.get('/api/evaluations/teacher-self-check'),
        api.get('/api/teachers/me')
      ])

      setQuestions(questionsRes.data)
      setStudentQuestions(studentQuestionsRes.data)
      setHasEvaluated(selfCheckRes.data.hasEvaluated)
      setTeacherInfo(teacherInfoRes.data)
    } catch (err) {
      setError('Error al cargar los datos. Por favor recarga la página.')
      console.log('Error cargando datos del docente:', err?.config?.url, err?.response?.status, err?.response?.data)
    } finally {
      setLoading(false)
    }

    // Opcional: si la direccion aun no ha dejado retroalimentacion, o el endpoint falla,
    // la pagina del docente debe seguir funcionando igual
    try {
      const directorFeedbackRes = await api.get('/api/improvement-plans/from-director')
      setDirectorFeedback(directorFeedbackRes.data.plans || [])
    } catch (err) {
      setDirectorFeedback([])
      console.log('No se pudo cargar la retroalimentación del directivo:', err?.response?.status)
    }
  }

const loadResults = async () => {
    try {
      const [resultsRes, plansRes] = await Promise.all([
        api.get('/api/evaluations/teacher-results'),
        api.get('/api/improvement-plans')
      ])
      setResults(resultsRes.data)
      setPlans(plansRes.data.plans || [])
    } catch (err) {
      console.log('Error cargando resultados:', err?.config?.url, err?.response?.status)
    }

    try {
      const feedbackRes = await api.get('/api/improvement-plans/from-director')
      setDirectorFeedback(feedbackRes.data.plans || [])
    } catch (err) {
      console.log('No se pudo cargar la retroalimentación del directivo:', err?.response?.status)
    }
  }

  const markAsEvaluated = () => setHasEvaluated(true)

  const completePlan = async (planId) => {
    try {
      const res = await api.patch(`/api/improvement-plans/${planId}`)
      setPlans(prev => prev.map(p => p._id === planId ? res.data.plan : p))
    } catch (err) {
      console.log('Error marcando plan como completado:', err)
      throw err
    }
  }

  const deletePlan = async (planId) => {
    try {
      await api.delete(`/api/improvement-plans/${planId}`)
      setPlans(prev => prev.filter(p => p._id !== planId))
    } catch (err) {
      console.log('Error eliminando plan de mejora:', err)
      throw err
    }
  }
  return { questions, studentQuestions, results, plans, directorFeedback, teacherInfo, hasEvaluated, loading, error, loadResults, markAsEvaluated, setPlans, completePlan, deletePlan }
}