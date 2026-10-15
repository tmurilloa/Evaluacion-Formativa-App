import { useState } from 'react'
import axios from '../api/axios.js'

export default function ImprovementPlanModal({ teacherId, userEmail, onSaved, onClose }) {
  const [goal, setGoal] = useState('')
  const [actions, setActions] = useState('')
  const [indicators, setIndicators] = useState('')
  const [deadline, setDeadline] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!goal || !actions || !indicators || !deadline) {
      return setError('Por favor completa todos los campos')
    }

    setSubmitting(true)
    try {
      const res = await axios.post('/api/improvement-plans', {
        goal,
        actions,
        indicators,
        deadline
      })
      onSaved(res.data)
    } catch (err) {
      setError('Error al guardar el plan. Por favor intenta nuevamente.')
      console.log('Error guardando plan de mejora:', err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-lg">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Registrar acciones de mejoramiento</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              {error && <div className="alert alert-danger">{error}</div>}

              <div className="mb-3">
                <label className="form-label">Meta principal</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ej: Mejorar la participación estudiantil en clase"
                  value={goal}
                  onChange={e => setGoal(e.target.value)}
                  required
                />
              </div>

              <div className="mb-3">
                <label className="form-label">Acciones a implementar</label>
                <textarea
                  className="form-control"
                  rows="3"
                  placeholder="Describa las acciones concretas..."
                  value={actions}
                  onChange={e => setActions(e.target.value)}
                  required
                />
              </div>

              <div className="mb-3">
                <label className="form-label">Indicadores de éxito</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ej: Aumento del 20% en participación oral"
                  value={indicators}
                  onChange={e => setIndicators(e.target.value)}
                  required
                />
              </div>

              <div className="mb-3">
                <label className="form-label">Fecha límite</label>
                <input
                  type="date"
                  className="form-control"
                  value={deadline}
                  onChange={e => setDeadline(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-success" disabled={submitting}>
                {submitting ? 'Guardando...' : 'Guardar Plan'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}