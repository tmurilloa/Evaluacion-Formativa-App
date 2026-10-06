import { useState, useEffect, useRef, useMemo } from 'react'
import { useUser, useClerk } from '@clerk/clerk-react'
import { useStudentData } from '../hooks/useStudentData.js'
import { getErrorMessage } from '../utils/errors.js'
import AppLayout from '../components/AppLayout.jsx'

const DEBOUNCE_MS = 600

export default function StudentPage() {
  const { user } = useUser()
  const { signOut } = useClerk()
  const userEmail = user?.primaryEmailAddress?.emailAddress

  const { teachers, questions, progress, loading, error, saveAnswer, finalizeTeacher } = useStudentData(userEmail)

  const sortedQuestions = useMemo(
    () => [...questions].sort((a, b) => a.number - b.number),
    [questions]
  )

  const [answers, setAnswers] = useState({})
  const [initialized, setInitialized] = useState(false)
  const [currentTeacherIndex, setCurrentTeacherIndex] = useState(0)
  const [finalizing, setFinalizing] = useState(false)
  const [saveError, setSaveError] = useState('')

  const [extraSelected, setExtraSelected] = useState([])
  const [teacherToAdd, setTeacherToAdd] = useState('')

  const debounceTimers = useRef({})

  // Un profesor está "seleccionado" si tiene un borrador guardado o si se agregó en esta sesión.
  const selectedIds = useMemo(() => {
    const fromProgress = teachers
      .filter(t => progress[t.id] && progress[t.id].status !== 'submitted')
      .map(t => t.id)
    return Array.from(new Set([...fromProgress, ...extraSelected]))
  }, [teachers, progress, extraSelected])

  const pendingTeachers = teachers.filter(t => selectedIds.includes(t.id))
  const availableTeachers = teachers.filter(t => progress[t.id]?.status !== 'submitted' && !selectedIds.includes(t.id))

  // Hidratar respuestas guardadas una sola vez cuando llegan los datos.
  if (!initialized && !loading && sortedQuestions.length > 0) {
    const seeded = {}
    pendingTeachers.forEach(t => {
      seeded[t.id] = {
        scores: { ...(progress[t.id]?.scores || {}) },
        openAnswers: { ...(progress[t.id]?.openAnswers || {}) }
      }
    })
    setAnswers(seeded)
    setInitialized(true)
  }

  useEffect(() => {
    return () => {
      Object.values(debounceTimers.current).forEach(byQuestion => {
        Object.values(byQuestion).forEach(timer => clearTimeout(timer))
      })
    }
  }, [])

  const handleAddTeacher = () => {
    if (!teacherToAdd) return
    setExtraSelected(prev => [...prev, teacherToAdd])
    setAnswers(prev => ({
      ...prev,
      [teacherToAdd]: prev[teacherToAdd] || { scores: {}, openAnswers: {} }
    }))
    setCurrentTeacherIndex(pendingTeachers.length) // apuntar al recién agregado
    setTeacherToAdd('')
  }

  const handleRemoveTeacher = (teacherId) => {
    if (progress[teacherId]) return
    setExtraSelected(prev => prev.filter(id => id !== teacherId))
  }

  const isAnswered = (teacherId, question) => {
    const a = answers[teacherId]
    if (!a) return false
    if (question.questionType === 'likert') return a.scores?.[question.number] != null
    return !!a.openAnswers?.[question.number]?.trim()
  }

  const handleLikertChange = (teacherId, question, value) => {
    setAnswers(prev => ({
      ...prev,
      [teacherId]: { ...prev[teacherId], scores: { ...prev[teacherId]?.scores, [question.number]: value } }
    }))
    setSaveError('')
    saveAnswer(teacherId, question.number, 'likert', value).catch(err => {
      setSaveError(getErrorMessage(err, 'No se pudo guardar una respuesta.'))
    })
  }

  const handleOpenAnswerChange = (teacherId, question, value) => {
    setAnswers(prev => ({
      ...prev,
      [teacherId]: { ...prev[teacherId], openAnswers: { ...prev[teacherId]?.openAnswers, [question.number]: value } }
    }))
    setSaveError('')
    if (!debounceTimers.current[teacherId]) debounceTimers.current[teacherId] = {}
    clearTimeout(debounceTimers.current[teacherId][question.number])
    debounceTimers.current[teacherId][question.number] = setTimeout(() => {
      saveAnswer(teacherId, question.number, 'abierta', value).catch(err => {
        setSaveError(getErrorMessage(err, 'No se pudo guardar una respuesta.'))
      })
      delete debounceTimers.current[teacherId][question.number]
    }, DEBOUNCE_MS)
  }

  const flushPending = async () => {
    const promises = []
    Object.entries(debounceTimers.current).forEach(([teacherId, byQuestion]) => {
      Object.entries(byQuestion).forEach(([questionNumber, timer]) => {
        clearTimeout(timer)
        const value = answers[teacherId]?.openAnswers?.[questionNumber] ?? ''
        promises.push(saveAnswer(teacherId, Number(questionNumber), 'abierta', value))
      })
    })
    debounceTimers.current = {}
    await Promise.allSettled(promises)
  }

  const safeIndex = pendingTeachers.length ? Math.min(currentTeacherIndex, pendingTeachers.length - 1) : 0
  const currentTeacher = pendingTeachers[safeIndex]
  const answeredCount = currentTeacher ? sortedQuestions.filter(q => isAnswered(currentTeacher.id, q)).length : 0
  const allAnsweredForTeacher = currentTeacher && sortedQuestions.length > 0 && answeredCount === sortedQuestions.length

  const goPrevTeacher = async () => {
    await flushPending()
    setCurrentTeacherIndex(i => Math.max(0, i - 1))
  }
  const goNextTeacher = async () => {
    await flushPending()
    setCurrentTeacherIndex(i => Math.min(pendingTeachers.length - 1, i + 1))
  }

  const handleFinalizeTeacher = async () => {
    if (!currentTeacher) return
    await flushPending()
    setFinalizing(true)
    setSaveError('')
    try {
      await finalizeTeacher(currentTeacher.id)
      setExtraSelected(prev => prev.filter(id => id !== currentTeacher.id))
      setCurrentTeacherIndex(0)
    } catch (err) {
      setSaveError(getErrorMessage(err, 'No se pudo finalizar la evaluación de este profesor. Revisa que respondiste todo.'))
    } finally {
      setFinalizing(false)
    }
  }

  if (error) {
    return (
      <div className="container mt-5">
        <div className="alert alert-danger">{error}</div>
        <button className="btn btn-primary" onClick={() => window.location.reload()}>Reintentar</button>
      </div>
    )
  }

  if (loading || !initialized) {
    return (
      <div className="container mt-5 text-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Cargando...</span>
        </div>
        <p className="mt-2">Cargando datos...</p>
      </div>
    )
  }

  return (
    <AppLayout
      title="Evaluación de Percepción Estudiantil"
      roleLabel="Estudiante"
      userName={user?.firstName || userEmail}
      onSignOut={() => signOut()}
      nav={[
        { label: 'Evaluación', icon: 'bi-clipboard-check', active: true, onClick: () => {} },
      ]}
    >
      <div className="card">
        <div className="card-body">
          {saveError && <div className="alert alert-danger">{saveError}</div>}

          {/* Agregar profesores */}
          {availableTeachers.length > 0 && (
            <div className="mb-4">
              <label className="form-label">Agrega los profesores que te corresponde evaluar este semestre:</label>
              <div className="d-flex gap-2">
                <select className="form-select" value={teacherToAdd} onChange={e => setTeacherToAdd(e.target.value)}>
                  <option value="">-- Seleccione un docente --</option>
                  {availableTeachers.map(teacher => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.name}{teacher.subject ? ` - ${teacher.subject}` : ''}
                    </option>
                  ))}
                </select>
                <button type="button" className="btn btn-outline-primary flex-shrink-0" onClick={handleAddTeacher} disabled={!teacherToAdd}>
                  Agregar
                </button>
              </div>

              {pendingTeachers.length > 0 && (
                <ul className="list-group mt-2">
                  {pendingTeachers.map((teacher, i) => (
                    <li key={teacher.id} className={`list-group-item d-flex justify-content-between align-items-center ${i === safeIndex ? 'active' : ''}`}>
                      <button type="button" className="btn btn-link p-0 text-decoration-none text-start flex-grow-1" style={{ color: 'inherit' }} onClick={() => setCurrentTeacherIndex(i)}>
                        {teacher.name}{teacher.subject ? ` - ${teacher.subject}` : ''}
                      </button>
                      {!progress[teacher.id] && (
                        <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => handleRemoveTeacher(teacher.id)}>
                          Quitar
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {pendingTeachers.length === 0 ? (
            <div className="alert alert-success">
              {availableTeachers.length === 0
                ? '¡Gracias! Ya evaluaste a todos los profesores disponibles. Tu respuesta es anónima.'
                : 'Aún no has agregado profesores para evaluar. Usa el selector de arriba para agregar los que te correspondan este semestre.'}
            </div>
          ) : (
            <>
              <div className="d-flex justify-content-between align-items-center mb-1">
                <h5 className="mb-0">Evaluando a: {currentTeacher.name}{currentTeacher.subject ? ` - ${currentTeacher.subject}` : ''}</h5>
                <span className="text-muted">Profesor {safeIndex + 1} de {pendingTeachers.length}</span>
              </div>
              <p className="text-muted">Respondidas {answeredCount} de {sortedQuestions.length}. Tu respuesta es anónima.</p>
              <div className="progress mb-4" style={{ height: '6px' }}>
                <div className="progress-bar" role="progressbar" style={{ width: `${(answeredCount / sortedQuestions.length) * 100}%` }} />
              </div>

              <div className="evaluation-scale mb-4">
                <div className="scale-item">1: Totalmente en desacuerdo</div>
                <div className="scale-item">2: En desacuerdo</div>
                <div className="scale-item">3: Indiferente</div>
                <div className="scale-item">4: De acuerdo</div>
                <div className="scale-item">5: Totalmente de acuerdo</div>
              </div>

              {sortedQuestions.map((q, i) => (
                <div key={q.number} className="evaluation-item mb-3">
                  <div className="d-flex justify-content-between align-items-start mb-2 gap-2">
                    <span className="fw-semibold">{i + 1}. {q.question}</span>
                    <span className="badge bg-secondary flex-shrink-0">{q.category}</span>
                  </div>

                  {q.questionType === 'likert' ? (
                    <div className="d-flex align-items-center flex-wrap">
                      {[1, 2, 3, 4, 5].map(value => (
                        <div key={value}>
                          <input
                            type="radio"
                            className="btn-check"
                            name={`q-${q.number}-${currentTeacher.id}`}
                            id={`q-${q.number}-${currentTeacher.id}-${value}`}
                            value={value}
                            checked={answers[currentTeacher.id]?.scores?.[q.number] === value}
                            onChange={() => handleLikertChange(currentTeacher.id, q, value)}
                          />
                          <label className="btn btn-outline-primary rounded-circle me-2" htmlFor={`q-${q.number}-${currentTeacher.id}-${value}`}>
                            {value}
                          </label>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <textarea
                      className="form-control"
                      rows="3"
                      placeholder="Escribe tu respuesta aquí..."
                      value={answers[currentTeacher.id]?.openAnswers?.[q.number] || ''}
                      onChange={e => handleOpenAnswerChange(currentTeacher.id, q, e.target.value)}
                    />
                  )}
                </div>
              ))}

              <div className="mt-3 d-flex gap-2 flex-wrap">
                <button type="button" className="btn btn-secondary" onClick={goPrevTeacher} disabled={safeIndex === 0 || finalizing}>
                  Profesor anterior
                </button>
                <button type="button" className="btn btn-outline-secondary" onClick={goNextTeacher} disabled={safeIndex >= pendingTeachers.length - 1 || finalizing}>
                  Profesor siguiente
                </button>
                <button type="button" className="btn btn-primary ms-auto" onClick={handleFinalizeTeacher} disabled={!allAnsweredForTeacher || finalizing}>
                  {finalizing ? 'Enviando...' : `Finalizar evaluación de este profesor`}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </AppLayout>
  )
}