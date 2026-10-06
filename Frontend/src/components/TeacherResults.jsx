import { useState } from 'react'
import { BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import FrequentTerms from './FrequentTerms.jsx'
import { COLORES } from '../theme.js'
import { RESPUESTAS_VISIBLES, BRECHA_RELEVANTE } from '../config/umbrales.js'

function processResults(results, questions, studentQuestions) {
  if (!results || !results.hasData) return null

  const { selfEvaluation, studentEvaluations } = results
  const selfOpenQuestions = questions?.filter(q => q.questionType === 'abierta') || []
  const studentOpenQuestions = studentQuestions?.filter(q => q.questionType === 'abierta') || []

  // Scores Likert - autoevaluación
  const selfScores = selfEvaluation
    ? Object.entries(selfEvaluation.evaluationData?.scores || {}).map(([id, score]) => ({
        questionId: parseInt(id),
        score
      }))
    : []

  // Respuestas abiertas - autoevaluación
  const selfOpenAnswers = selfEvaluation
    ? selfOpenQuestions.map(q => ({
        question: q.question,
        answer: selfEvaluation.evaluationData?.openAnswers?.[q.number] || ''
      })).filter(a => a.answer)
    : []

  // Scores Likert - estudiantes
  const studentScoresMap = {}
  studentEvaluations.forEach(evaluation => {
    const scoresData = evaluation.evaluationData?.scores || {}
    Object.entries(scoresData).forEach(([id, score]) => {
      const questionId = parseInt(id)
      if (!studentScoresMap[questionId]) studentScoresMap[questionId] = []
      if (typeof score === 'number' && score > 0) studentScoresMap[questionId].push(score)
    })
  })

  const studentScores = Object.entries(studentScoresMap).map(([id, scores]) => ({
    questionId: parseInt(id),
    score: scores.reduce((a, b) => a + b, 0) / scores.length
  }))

  // Respuestas abiertas - estudiantes agrupadas por pregunta
  const studentOpenAnswers = studentOpenQuestions.map(q => ({
    question: q.question,
    answers: studentEvaluations
      .map(e => e.evaluationData?.openAnswers?.[q.number])
      .filter(a => a && a.trim())
  })).filter(a => a.answers.length > 0)

  return {
    selfScores,
    studentScores,
    selfOpenAnswers,
    studentOpenAnswers,
    hasData: selfScores.length > 0 || studentScores.length > 0,
    hasSelfEvaluation: selfScores.length > 0,
    hasStudentEvaluations: studentScores.length > 0,
    studentCount: studentEvaluations.length
  }
}

function exportCSV(teacherName, processedData) {
  if (!processedData?.hasData) return

  let csv = `Resultados de Evaluación - ${teacherName}\n`
  csv += `Fecha: ${new Date().toLocaleDateString()}\n\n`

  if (processedData.hasSelfEvaluation) {
    const avg = processedData.selfScores.reduce((s, x) => s + x.score, 0) / processedData.selfScores.length
    csv += `AUTOEVALUACIÓN\nPromedio,${avg.toFixed(2)}\n\n`

    if (processedData.selfOpenAnswers?.length > 0) {
      csv += `RESPUESTAS ABIERTAS - AUTOEVALUACIÓN\n`
      processedData.selfOpenAnswers.forEach(a => {
        csv += `"${a.question}","${a.answer.replace(/"/g, '""')}"\n`
      })
      csv += '\n'
    }
  }

  if (processedData.hasStudentEvaluations) {
    const avg = processedData.studentScores.reduce((s, x) => s + x.score, 0) / processedData.studentScores.length
    csv += `EVALUACIÓN ESTUDIANTIL\nEvaluaciones recibidas,${processedData.studentCount}\nPromedio,${avg.toFixed(2)}\n\n`

    if (processedData.studentOpenAnswers?.length > 0) {
      csv += `RESPUESTAS ABIERTAS - ESTUDIANTES\n`
      processedData.studentOpenAnswers.forEach(a => {
        csv += `Pregunta,"${a.question}"\n`
        a.answers.forEach((ans, i) => {
          csv += `Respuesta ${i + 1},"${ans.replace(/"/g, '""')}"\n`
        })
        csv += '\n'
      })
    }
  }

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `resultados_${teacherName}_${new Date().toISOString().split('T')[0]}.csv`
  link.click()
}

function truncateText(text, maxLength = 150) {
  if (!text) return ''
  return text.length > maxLength ? text.slice(0, maxLength).trimEnd() + '...' : text
}

function getQuestionText(questions, questionId) {
  const found = questions?.find(q => q.number === questionId)
  return found?.question || `Pregunta ${questionId}`
}

function OpenAnswersSection({ processedData }) {
  const hasSelf = processedData?.selfOpenAnswers?.length > 0
  const hasStudent = processedData?.studentOpenAnswers?.some(q => q.answers.length > 0)

  if (!hasSelf && !hasStudent) return null

  return (
    <div className="mb-4">
      <h5 className="mb-3"><i className="bi bi-chat-left-text me-2"></i>Respuestas Abiertas</h5>

      {hasSelf && (
        <div className="mb-4">
          <h6 className="text-uppercase text-muted fw-semibold mb-3" style={{ fontSize: '0.75rem', letterSpacing: '0.08em' }}>
            Autoevaluación
          </h6>
          {processedData.selfOpenAnswers.map((item, i) => (
            <div key={i} className="mb-3">
              <p className="fw-semibold mb-1 text-dark" style={{ fontSize: '0.9rem' }}>{item.question}</p>
              <div className="p-3 rounded" style={{ backgroundColor: COLORES.fondoSuave, borderLeft: `3px solid ${COLORES.verdeOscuro}` }}>
                <p className="mb-0" style={{ fontSize: '0.9rem' }}>{item.answer}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {hasSelf && hasStudent && <hr className="my-3" />}

      {hasStudent && (
        <div>
          <h6 className="text-uppercase text-muted fw-semibold mb-3" style={{ fontSize: '0.75rem', letterSpacing: '0.08em' }}>
            Respuestas de estudiantes
          </h6>
          {processedData.studentOpenAnswers
            .filter(q => q.answers.length > 0)
            .map((item, i) => {
              const total = item.answers.length
              const shown = item.answers.slice(0, RESPUESTAS_VISIBLES)
              return (
                <div key={i} className="mb-4">
                  <p className="fw-semibold mb-1 text-dark" style={{ fontSize: '0.9rem' }}>{item.question}</p>
                  {total > RESPUESTAS_VISIBLES && (
                    <p className="text-muted mb-2" style={{ fontSize: '0.78rem' }}>
                      Mostrando {RESPUESTAS_VISIBLES} de {total} respuestas
                    </p>
                  )}
                  <FrequentTerms answers={item.answers} />
                  <ul className="list-unstyled mb-0">
                    {shown.map((ans, j) => (
                      <li key={j} className="mb-2 d-flex align-items-start gap-2">
                        <span className="badge rounded-pill mt-1 flex-shrink-0" style={{ backgroundColor: COLORES.verde, fontSize: '0.7rem' }}>
                          {j + 1}
                        </span>
                        <span style={{ fontSize: '0.9rem' }}>{ans}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          <p className="text-muted mb-0" style={{ fontSize: '0.8rem' }}>
            Para ver todas las respuestas, exporta el reporte CSV completo.
          </p>
        </div>
      )}
    </div>
  )
}

function PlanCard({ plan, index, total, onComplete, onDelete }) {
  const [actionLoading, setActionLoading] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const deadline = new Date(plan.deadline)
  const isCompleted = plan.status === 'completado'
  const isOverdue = !isCompleted && deadline < new Date()

  let badgeLabel = 'Activo'
  let headerClass = 'bg-light'
  let badgeClass = 'bg-secondary'

  if (isCompleted) {
    badgeLabel = 'Completado'
    headerClass = 'bg-success text-white'
    badgeClass = 'bg-light text-success'
  } else if (isOverdue) {
    badgeLabel = 'Vencido'
    headerClass = 'bg-danger text-white'
    badgeClass = 'bg-light text-danger'
  }

  const handleComplete = async () => {
    setActionLoading(true)
    try {
      await onComplete(plan._id)
    } catch {
      // el error ya se loguea en el hook; aquí solo evitamos que quede colgado el botón
    } finally {
      setActionLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirmingDelete) {
      setConfirmingDelete(true)
      return
    }
    setActionLoading(true)
    try {
      await onDelete(plan._id)
    } catch {
      setActionLoading(false)
      setConfirmingDelete(false)
    }
  }

  return (
    <div className="card mb-3">
      <div className={`card-header d-flex justify-content-between align-items-center ${headerClass}`}>
        <h6 className="mb-0"><i className="bi bi-calendar-event me-2"></i>Plan de Mejora #{total - index}</h6>
        <span className={`badge ${badgeClass}`}>{badgeLabel}</span>
      </div>
      <div className="card-body">
        <p><strong>Meta:</strong> {plan.goal}</p>
        <p><strong>Acciones:</strong> {plan.actions}</p>
        <p><strong>Indicadores:</strong> {plan.indicators}</p>
        <p className="mb-3"><strong>Fecha límite:</strong> {deadline.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

        <div className="d-flex gap-2">
          {!isCompleted && (
            <button
              className="btn btn-sm btn-outline-success"
              onClick={handleComplete}
              disabled={actionLoading}
            >
              <i className="bi bi-check-lg me-1"></i>
              {actionLoading ? 'Guardando...' : 'Marcar como completado'}
            </button>
          )}

          <button
            className={`btn btn-sm ${confirmingDelete ? 'btn-danger' : 'btn-outline-danger'}`}
            onClick={handleDelete}
            disabled={actionLoading}
          >
            <i className="bi bi-trash me-1"></i>
            {actionLoading ? 'Eliminando...' : confirmingDelete ? '¿Confirmar eliminación?' : 'Eliminar'}
          </button>

          {confirmingDelete && !actionLoading && (
            <button
              className="btn btn-sm btn-link text-muted"
              onClick={() => setConfirmingDelete(false)}
            >
              Cancelar
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function TeacherResults({ results, plans, questions, studentQuestions, teacherId, onClose, onCreatePlan, onCompletePlan, onDeletePlan }) {
  const processedData = processResults(results, questions, studentQuestions)

  const selfAverage = processedData?.hasSelfEvaluation
    ? processedData.selfScores.reduce((s, x) => s + x.score, 0) / processedData.selfScores.length
    : 0

  const studentAverage = processedData?.hasStudentEvaluations
    ? processedData.studentScores.reduce((s, x) => s + x.score, 0) / processedData.studentScores.length
    : 0

  const barData = [
    { name: 'Promedio General', Autoevaluación: parseFloat(selfAverage.toFixed(2)), Estudiantes: parseFloat(studentAverage.toFixed(2)) }
  ]

  const radarData = ['1-2', '2-3', '3-4', '4-5'].map((range, i) => {
    const ranges = [[0, 2], [2, 3], [3, 4], [4, 5]]
    const [min, max] = ranges[i]
    return {
      range,
      Autoevaluación: processedData?.selfScores.filter(s => s.score > min && s.score <= max).length || 0,
      Estudiantes: processedData?.studentScores.filter(s => s.score > min && s.score <= max).length || 0
    }
  })

  return (
    <div className="card mt-4">
      <div className="card-header role-teacher d-flex justify-content-between align-items-center">
        <h4 className="mb-0">Resultados de Evaluación</h4>
        <div className="d-flex gap-2">
          <button
            className="btn btn-sm btn-light"
            onClick={() => exportCSV(teacherId?.split('@')[0], processedData)}
          >
            <i className="bi bi-download me-1"></i>Exportar
          </button>
          <button className="btn btn-sm btn-secondary" onClick={onClose}>
            <i className="bi bi-x-lg me-1"></i>Cerrar
          </button>
        </div>
      </div>

      <div className="card-body">
        {!processedData?.hasData ? (
          <div className="alert alert-info">
            <h5 className="alert-heading"><i className="bi bi-info-circle me-2"></i>No hay datos disponibles</h5>
            <p className="mb-0">Aún no se han recopilado suficientes datos para generar resultados.</p>
            <hr />
            <p className="mb-0 small">
              {!results?.selfEvaluation && '• Completa tu autoevaluación'}
              {(!results?.studentEvaluations || results.studentEvaluations.length === 0) && <><br />• Espera a que los estudiantes completen sus evaluaciones</>}
            </p>
          </div>
        ) : (
          <>
            {/* Gráficas */}
            <div className="row mb-4">
              <div className="col-lg-6 mb-4">
                <h5 className="mb-3">Promedio General</h5>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={barData}>
                    <XAxis dataKey="name" />
                    <YAxis domain={[0, 5]} />
                    <Tooltip />
                    <Legend />
                    {processedData.hasSelfEvaluation && <Bar dataKey="Autoevaluación" fill={COLORES.verdeOscuro} />}
                    {processedData.hasStudentEvaluations && <Bar dataKey="Estudiantes" fill={COLORES.verde} />}
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="col-lg-6 mb-4">
                <h5 className="mb-3">Distribución de Puntuaciones</h5>
                <ResponsiveContainer width="100%" height={250}>
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="range" />
                    <Tooltip />
                    <Legend />
                    {processedData.hasSelfEvaluation && <Radar name="Autoevaluación" dataKey="Autoevaluación" stroke={COLORES.verdeOscuro} fill={COLORES.verdeOscuro} fillOpacity={0.2} />}
                    {processedData.hasStudentEvaluations && <Radar name="Estudiantes" dataKey="Estudiantes" stroke={COLORES.verde} fill={COLORES.verde} fillOpacity={0.2} />}
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Resumen */}
            <div className="alert alert-info mb-4">
              {processedData.hasSelfEvaluation && (
                <p className="mb-1"><strong>Promedio Autoevaluación:</strong> <span className="badge bg-info">{selfAverage.toFixed(2)}</span></p>
              )}
              {processedData.hasStudentEvaluations && (
                <p className="mb-1"><strong>Promedio Estudiantes ({processedData.studentCount}):</strong> <span className="badge bg-primary">{studentAverage.toFixed(2)}</span></p>
              )}
              {processedData.hasSelfEvaluation && processedData.hasStudentEvaluations && (() => {
                // Convencion unica en toda la app: brecha = estudiantes - autoevaluacion
                const brecha = studentAverage - selfAverage

                if (brecha <= -BRECHA_RELEVANTE) {
                  return <p className="mb-0 mt-2 text-warning"><i className="bi bi-exclamation-triangle me-2"></i>Tu autoevaluación es {Math.abs(brecha).toFixed(2)} puntos más alta que la percepción estudiantil.</p>
                }
                if (brecha >= BRECHA_RELEVANTE) {
                  return <p className="mb-0 mt-2 text-success"><i className="bi bi-check-circle me-2"></i>Los estudiantes valoran tu desempeño {brecha.toFixed(2)} puntos más alto que tu autoevaluación.</p>
                }
                return <p className="mb-0 mt-2"><i className="bi bi-check-circle me-2"></i>Hay buena alineación entre tu autoevaluación y la percepción estudiantil.</p>
              })()}
            </div>

            {/* Tablas detalladas */}
            {processedData.hasSelfEvaluation && (
              <div className="mb-4">
                <h6 className="text-primary"><i className="bi bi-person-check me-2"></i>Autoevaluación Docente</h6>
                <div className="table-responsive">
                  <table className="table table-bordered table-sm">
                    <thead className="table-primary">
                      <tr><th>Pregunta</th><th className="text-center">Puntuación</th></tr>
                    </thead>
                    <tbody>
                      {processedData.selfScores.map(s => {
                        const questionText = getQuestionText(questions, s.questionId)
                        return (
                          <tr key={s.questionId}>
                            <td title={questionText}>{truncateText(questionText)}</td>
                            <td className="text-center"><span className="badge bg-info">{s.score}</span></td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {processedData.hasStudentEvaluations && (
              <div className="mb-4">
                <h6 className="text-warning"><i className="bi bi-people-fill me-2"></i>Evaluación Estudiantil (Promedio)</h6>
                <div className="table-responsive">
                  <table className="table table-bordered table-sm">
                    <thead className="table-warning">
                      <tr><th>Pregunta</th><th className="text-center">Promedio</th></tr>
                    </thead>
                    <tbody>
                        {processedData.studentScores.map(s => {
                          const questionText = getQuestionText(studentQuestions, s.questionId)
                        return (
                          <tr key={s.questionId}>
                            <td title={questionText}>{truncateText(questionText)}</td>
                            <td className="text-center"><span className="badge bg-primary">{s.score.toFixed(1)}</span></td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <OpenAnswersSection processedData={processedData} />
          </>
        )}

        {/* Planes de mejora */}
        <div className="mt-4">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5><i className="bi bi-journal-text me-2"></i>Planes de Mejora</h5>
            <button className="btn btn-sm btn-primary" onClick={onCreatePlan}>
              <i className="bi bi-plus me-1"></i>Nuevo Plan
            </button>
          </div>

          {plans.length === 0 ? (
            <div className="alert alert-info">
              <i className="bi bi-info-circle me-2"></i>
              No hay planes de mejora registrados.
            </div>
          ) : (
            plans.map((plan, index) => (
              <PlanCard
                key={plan._id || index}
                plan={plan}
                index={index}
                total={plans.length}
                onComplete={onCompletePlan}
                onDelete={onDeletePlan}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}