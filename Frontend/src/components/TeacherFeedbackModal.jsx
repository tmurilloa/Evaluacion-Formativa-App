import { useState, useEffect } from 'react'
import api from '../api/axios.js'

export default function TeacherFeedbackModal({ teacher, onClose }) {
    const [feedback, setFeedback] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [form, setForm] = useState({ period: '', comments: '', goal: '', actions: '', indicators: '', deadline: '' })
    const [saving, setSaving] = useState(false)
    const [saveError, setSaveError] = useState('')

    useEffect(() => {
    if (!teacher) return
    loadFeedback()
    }, [teacher])

    const loadFeedback = async () => {
    setLoading(true)
    setError('')
    try {
        const res = await api.get('/api/improvement-plans/teacher/' + encodeURIComponent(teacher.id))
        setFeedback(res.data.plans || [])
    } catch (err) {
        setError('No se pudo cargar la retroalimentación.')
        console.log('Error cargando retroalimentación:', err)
    } finally {
        setLoading(false)
    }
    }

    const handleChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }))

    const handleSubmit = async (e) => {
    e.preventDefault()
    setSaveError('')
    const { period, goal, actions, indicators, deadline } = form
    if (!period || !goal || !actions || !indicators || !deadline) {
        return setSaveError('Completa periodo, meta, acciones, indicadores y fecha límite.')
    }
    setSaving(true)
    try {
        await api.post('/api/improvement-plans/teacher/' + encodeURIComponent(teacher.id), form)
        setForm({ period: '', comments: '', goal: '', actions: '', indicators: '', deadline: '' })
        await loadFeedback()
    } catch (err) {
        setSaveError('No se pudo guardar la retroalimentación.')
        console.log('Error guardando retroalimentación:', err)
    } finally {
        setSaving(false)
    }
    }

    if (!teacher) return null

    const labelStyle = { fontSize: '0.75rem', letterSpacing: '0.08em' }

    return (
    <>
        <div className="modal-backdrop fade show" onClick={onClose} style={{ zIndex: 1040 }} />
        <div className="modal fade show d-block" style={{ zIndex: 1050 }} role="dialog" aria-modal="true">
        <div className="modal-dialog modal-lg modal-dialog-scrollable">
            <div className="modal-content">
            <div className="modal-header">
                <h5 className="modal-title">Retroalimentación — {teacher.name}</h5>
                <button type="button" className="btn-close" onClick={onClose} aria-label="Cerrar" />
            </div>

            <div className="modal-body">
              {/* Resumen */}
                <div className="mb-4">
                <h6 className="text-uppercase text-muted fw-semibold mb-2" style={labelStyle}>Resumen</h6>
                <div className="d-flex flex-wrap gap-3">
                    <span>Autoevaluación: <strong>{teacher.hasSelfEvaluation ? teacher.selfAverage : 'Sin datos'}</strong></span>
                    <span>Promedio estudiantes: <strong>{teacher.studentEvaluationCount > 0 ? teacher.studentAverage : 'Sin datos'}</strong></span>
                    <span>Evaluaciones recibidas: <strong>{teacher.studentEvaluationCount}</strong></span>
                </div>
                </div>

              {/* Historial */}
                <div className="mb-4">
                <h6 className="text-uppercase text-muted fw-semibold mb-2" style={labelStyle}>Historial de retroalimentación</h6>
                {error && <div className="alert alert-danger">{error}</div>}
                {loading ? (
                    <p className="text-muted">Cargando...</p>
                ) : feedback.length === 0 ? (
                    <p className="text-muted">Aún no hay retroalimentación registrada para este docente.</p>
                ) : (
                    feedback.map(f => (
                    <div key={f._id} className="border rounded p-3 mb-2">
                        <div className="d-flex justify-content-between align-items-center">
                        <span className="badge bg-secondary">Periodo {f.period}</span>
                        <small className="text-muted">{new Date(f.createdAt).toLocaleDateString('es-ES')}</small>
                        </div>
                        {f.comments && <p className="mt-2 mb-1">{f.comments}</p>}
                        <p className="mb-1"><strong>Meta:</strong> {f.goal}</p>
                        <p className="mb-1"><strong>Acciones:</strong> {f.actions}</p>
                        <p className="mb-1"><strong>Indicadores:</strong> {f.indicators}</p>
                        <p className="mb-0"><strong>Fecha límite:</strong> {new Date(f.deadline).toLocaleDateString('es-ES')}</p>
                    </div>
                    ))
                )}
                </div>

              {/* Formulario */}
                <div>
                <h6 className="text-uppercase text-muted fw-semibold mb-2" style={labelStyle}>Nueva retroalimentación</h6>
                {saveError && <div className="alert alert-danger">{saveError}</div>}
                <form onSubmit={handleSubmit}>
                    <div className="mb-2">
                    <label className="form-label">Periodo</label>
                    <input className="form-control" placeholder="2026-1" value={form.period} onChange={e => handleChange('period', e.target.value)} />
                    </div>
                    <div className="mb-2">
                    <label className="form-label">Comentarios</label>
                    <textarea className="form-control" rows="2" value={form.comments} onChange={e => handleChange('comments', e.target.value)} />
                    </div>
                    <div className="mb-2">
                    <label className="form-label">Meta</label>
                    <input className="form-control" value={form.goal} onChange={e => handleChange('goal', e.target.value)} />
                    </div>
                    <div className="mb-2">
                    <label className="form-label">Acciones</label>
                    <input className="form-control" value={form.actions} onChange={e => handleChange('actions', e.target.value)} />
                    </div>
                    <div className="mb-2">
                    <label className="form-label">Indicadores</label>
                    <input className="form-control" value={form.indicators} onChange={e => handleChange('indicators', e.target.value)} />
                    </div>
                    <div className="mb-3">
                    <label className="form-label">Fecha límite</label>
                    <input type="date" className="form-control" value={form.deadline} onChange={e => handleChange('deadline', e.target.value)} />
                    </div>
                    <button type="submit" className="btn btn-success" disabled={saving}>
                    {saving ? 'Guardando...' : 'Guardar retroalimentación'}
                    </button>
                </form>
                </div>
            </div>

            <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={onClose}>Cerrar</button>
            </div>
            </div>
        </div>
        </div>
    </>
    )
}