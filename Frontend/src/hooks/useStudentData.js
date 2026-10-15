import { useState, useEffect } from 'react'
import api from '../api/axios.js'

// Reintenta solo fallos transitorios: sin respuesta (red), 429 o 5xx.
// Un 400/403 es definitivo y se devuelve de inmediato.
const esperar = (ms) => new Promise(resolve => setTimeout(resolve, ms))

async function conReintentos(fn, intentos = 3) {
  for (let i = 0; ; i++) {
    try {
      return await fn()
    } catch (err) {
      const status = err?.response?.status
      const transitorio = !status || status === 429 || status >= 500
      if (!transitorio || i >= intentos - 1) throw err
      await esperar(500 * 2 ** i) // 500 ms, 1 s
    }
  }
}

export function useStudentData(userEmail) {
  const [teachers, setTeachers] = useState([])
  const [inscripcion, setInscripcion] = useState(false)
  const [questions, setQuestions] = useState([])
  const [progress, setProgress] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!userEmail) return
    loadData()
  }, [userEmail])

  const loadData = async () => {
    setLoading(true)
    setError('')
    try {
      const [teachersRes, questionsRes, evaluationsRes] = await Promise.all([
        conReintentos(() => api.get('/api/teachers/mine')),
        conReintentos(() => api.get('/api/questions?type=student')),
        conReintentos(() => api.get('/api/evaluations/student'))
      ])

      setTeachers(teachersRes.data.teachers || [])
      setInscripcion(!!teachersRes.data.inscripcion)
      setQuestions(questionsRes.data)
      setProgress(evaluationsRes.data.progress || {})
    } catch (err) {
      setError('Error al cargar los datos. Por favor recarga la página.')
      console.log('Error cargando datos del estudiante:', err)
    } finally {
      setLoading(false)
    }
  }

  const saveAnswer = async (teacherId, questionNumber, questionType, value) => {
    setProgress(prev => ({
      ...prev,
      [teacherId]: {
        status: 'draft',
        scores: prev[teacherId]?.scores || {},
        openAnswers: prev[teacherId]?.openAnswers || {},
        [questionType === 'likert' ? 'scores' : 'openAnswers']: {
          ...(prev[teacherId]?.[questionType === 'likert' ? 'scores' : 'openAnswers'] || {}),
          [questionNumber]: value
        }
      }
    }))

    await conReintentos(() =>
      api.patch('/api/evaluations/answer', { teacherId, questionNumber, questionType, value })
    )
  }

  const finalizeTeacher = async (teacherId) => {
    try {
      await conReintentos(() => api.post('/api/evaluations/finalize', { teacherId }))
    } catch (err) {
      // 409 = ya estaba enviada (p. ej. un reintento tras perder la respuesta): es un exito.
      if (err?.response?.status !== 409) throw err
    }
    setProgress(prev => ({
      ...prev,
      [teacherId]: { ...prev[teacherId], status: 'submitted' }
    }))
  }

  return {
    teachers,
    inscripcion,
    questions,
    progress,
    loading,
    error,
    saveAnswer,
    finalizeTeacher,
    reload: loadData
  }
}
