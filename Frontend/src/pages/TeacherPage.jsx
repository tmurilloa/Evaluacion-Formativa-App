import { useState } from 'react'
import { useUser, useClerk } from '@clerk/clerk-react'
import { useTeacherData } from '../hooks/useTeacherData.js'
import TeacherEvalForm from '../components/TeacherEvalForm.jsx'
import TeacherResults from '../components/TeacherResults.jsx'
import ImprovementPlanModal from '../components/ImprovementPlanModal.jsx'
import DirectorFeedbackCard from '../components/DirectorFeedbackCard.jsx'
import AppLayout from '../components/AppLayout.jsx'

export default function TeacherPage() {
  const { user } = useUser()
  const { signOut } = useClerk()
  const teacherId = user?.primaryEmailAddress?.emailAddress

  const { questions,studentQuestions, results, plans, directorFeedback, teacherInfo, hasEvaluated, loading, error, loadResults, markAsEvaluated, setPlans, completePlan, deletePlan } = useTeacherData(teacherId)

  const [view, setView] = useState('dashboard')
  const [showPlanModal, setShowPlanModal] = useState(false)

  const handleStartEval = () => setView('eval')
  const handleCancelEval = () => setView('dashboard')

  const handleEvalSubmitted = () => {
    markAsEvaluated()
    setView('dashboard')
  }

  const handleViewResults = async () => {
    await loadResults()
    setView('results')
  }

  const handlePlanSaved = (newPlan) => {
    setPlans(prev => [newPlan.plan || newPlan, ...prev])
    setShowPlanModal(false)
  }

  if (loading) {
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
      title="Panel Docente"
      roleLabel="Docente"
      userName={teacherInfo?.name || teacherId}
      onSignOut={() => signOut()}
      nav={[
        { label: 'Inicio', icon: 'bi-house', active: view === 'dashboard', onClick: () => setView('dashboard') },
        { label: 'Autoevaluación', icon: 'bi-pencil-square', active: view === 'eval', onClick: () => { if (!hasEvaluated) setView('eval') } },
        { label: 'Resultados', icon: 'bi-bar-chart', active: view === 'results', onClick: handleViewResults },
        { label: 'Plan de Mejora', icon: 'bi-journal-text', active: false, onClick: () => setShowPlanModal(true) },
      ]}>
        {error && <div className="alert alert-danger">{error}</div>}

      {/* Dashboard - tres tarjetas */}
      {view === 'dashboard' && (
        <div className="row">
          <div className="col-md-4 mb-3">
            <div className="card dashboard-card h-100">
              <div className="card-header role-teacher">
                <h5 className="mb-0">Autoevaluación</h5>
              </div>
              <div className="card-media">
                <img src="/img/autoevaluacion.svg" alt="Autoevaluación" />
              </div>
              <div className="card-body d-flex flex-column">
                <p className="card-text">
                  {hasEvaluated
                    ? 'Ya has completado tu autoevaluación. Puedes revisar tus resultados.'
                    : 'Complete su autoevaluación formativa para reflexionar sobre su práctica docente.'}
                </p>
                <button
                  className={`btn mt-auto ${hasEvaluated ? 'btn-secondary' : 'btn-primary'}`}
                  onClick={handleStartEval}
                  disabled={hasEvaluated}
                >
                  {hasEvaluated
                    ? <><i className="bi bi-check-circle me-2"></i>Autoevaluación Completada</>
                    : 'Comenzar Autoevaluación'}
                </button>
              </div>
            </div>
          </div>

          <div className="col-md-4 mb-3">
            <div className="card dashboard-card h-100">
              <div className="card-header role-teacher">
                <h5 className="mb-0">Resultados</h5>
              </div>
              <div className="card-media">
                <img src="/img/resultados.svg" alt="Resultados" />
              </div>
              <div className="card-body d-flex flex-column">
                <p className="card-text">Revise sus resultados de autoevaluación y comparativos con percepciones estudiantiles.</p>
                <button className="btn btn-primary mt-auto" onClick={handleViewResults}>
                  Ver Resultados
                </button>
              </div>
            </div>
          </div>

          <div className="col-md-4 mb-3">
            <div className="card dashboard-card h-100">
              <div className="card-header role-teacher">
                <h5 className="mb-0">Plan de Mejoramiento</h5>
              </div>
              <div className="card-media">
                <img src="/img/plan-mejora.svg" alt="Plan de Mejora" />
              </div>
              <div className="card-body d-flex flex-column">
                <p className="card-text">Desarrolle y documente su plan de mejora continua basado en los resultados.</p>
                <button className="btn btn-primary mt-auto" onClick={() => setShowPlanModal(true)}>
                  Crear Plan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Formulario de autoevaluación */}
      {view === 'eval' && (
        <TeacherEvalForm
          questions={questions}
          teacherId={teacherId}
          userEmail={teacherId}
          onSubmitted={handleEvalSubmitted}
          onCancel={handleCancelEval}
        />
      )}

      {/* Resultados */}
      {view === 'results' && (
        <>
          <TeacherResults
            results={results}
            plans={plans}
            questions={questions}
            studentQuestions={studentQuestions}
            teacherId={teacherId}
            onClose={() => setView('dashboard')}
            onCreatePlan={() => setShowPlanModal(true)}
            onCompletePlan={completePlan}
            onDeletePlan={deletePlan}
          />
          <DirectorFeedbackCard feedback={directorFeedback} />
        </>
      )}

      {/* Modal plan de mejora */}
      {showPlanModal && (
        <ImprovementPlanModal
          teacherId={teacherId}
          userEmail={teacherId}
          onSaved={handlePlanSaved}
          onClose={() => setShowPlanModal(false)}
        />
      )}
    </AppLayout>
  )
}