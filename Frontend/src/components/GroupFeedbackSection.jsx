import { useState, useEffect } from 'react'
import api from '../api/axios.js'
import { getErrorMessage } from '../utils/errors.js'

const FORM_VACIO = { period: '', comments: '', goal: '', actions: '', indicators: '', deadline: '' }
const rotulo = { fontSize: '0.75rem', letterSpacing: '0.08em' }

export default function GroupFeedbackSection({ teachers }) {
    const [seleccionados, setSeleccionados] = useState([])
    const [form, setForm] = useState(FORM_VACIO)
    const [historial, setHistorial] = useState([])
    const [cargando, setCargando] = useState(true)
    const [guardando, setGuardando] = useState(false)
    const [error, setError] = useState('')
    const [exito, setExito] = useState('')

    useEffect(() => { cargarHistorial() }, [])

    const cargarHistorial = async () => {
    setCargando(true)
    try {
        const res = await api.get('/api/improvement-plans/group')
        setHistorial(res.data.plans || [])
    } catch (err) {
        setError(getErrorMessage(err, 'No se pudo cargar el historial.'))
    } finally {
        setCargando(false)
    }
    }

    const ordenados = [...teachers].sort((a, b) => a.name.localeCompare(b.name))
    const disponibles = ordenados.filter(t => !seleccionados.includes(t.id))
    const nombreDe = (id) => teachers.find(t => t.id === id)?.name || id

    const agregar = (id) => { if (id) setSeleccionados(prev => [...prev, id]) }
    const quitar = (id) => setSeleccionados(prev => prev.filter(x => x !== id))
    const handleChange = (campo, valor) => setForm(prev => ({ ...prev, [campo]: valor }))

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setExito('')
        if (seleccionados.length < 2) return setError('Selecciona al menos dos docentes.')
        const { period, goal, actions, indicators, deadline } = form
        if (!period || !goal || !actions || !indicators || !deadline) {
            return setError('Completa periodo, meta, acciones, indicadores y fecha límite.')
    }
    setGuardando(true)
    try {
        await api.post('/api/improvement-plans/group', { ...form, teacherIds: seleccionados })
        setExito(`Retroalimentación enviada a ${seleccionados.length} docentes.`)
        setForm(FORM_VACIO)
        setSeleccionados([])
        await cargarHistorial()
    } catch (err) {
        setError(getErrorMessage(err, 'No se pudo guardar la retroalimentación.'))
    } finally {
        setGuardando(false)
    }
    }

    return (
        <div className="card">
            <div className="card-header"><h5 className="mb-0">Plan de mejoramiento colectivo</h5></div>
            <div className="card-body">
        <p className="text-muted">
            Envíe una misma retroalimentación a un grupo de docentes. Para retroalimentar a un
            docente en particular, use el botón <strong>Retroalimentar</strong> en la tabla de Inicio.
        </p>

        {error && <div className="alert alert-danger">{error}</div>}
        {exito && <div className="alert alert-success">{exito}</div>}

        <form onSubmit={handleSubmit} className="mb-5">
          {/* Seleccion de docentes */}
            <label className="form-label">Docentes</label>
            <div className="d-flex gap-2 mb-2">
            <select className="form-select" value="" onChange={e => agregar(e.target.value)}>
                <option value="">-- Agregar docente --</option>
                {disponibles.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                ))}
            </select>
            <button type="button" className="btn btn-outline-secondary text-nowrap"
                onClick={() => setSeleccionados(ordenados.map(t => t.id))}
                disabled={disponibles.length === 0}>
                Todos
            </button>
            <button type="button" className="btn btn-outline-secondary text-nowrap"
                onClick={() => setSeleccionados([])}
                disabled={seleccionados.length === 0}>
                Ninguno
            </button>
            </div>

            <div className="d-flex flex-wrap gap-2 mb-3" style={{ minHeight: '1.8rem' }}>
            {seleccionados.length === 0 && (
                <span className="text-muted small align-self-center">Ningún docente seleccionado.</span>
            )}
            {seleccionados.map(id => (
                <span key={id} className="badge rounded-pill bg-info d-inline-flex align-items-center gap-2 py-2 px-3">
                {nombreDe(id)}
                <button type="button" className="btn-close btn-close-white" style={{ fontSize: '0.55rem' }}
                    aria-label={`Quitar ${nombreDe(id)}`} onClick={() => quitar(id)} />
                </span>
            ))}
            </div>

          {/* Contenido */}
            <div className="row g-2">
                <div className="col-md-4">
                    <label className="form-label">Periodo</label>
                    <input className="form-control" placeholder="2026-1" value={form.period}
                    onChange={e => handleChange('period', e.target.value)} />
            </div>
            <div className="col-md-8">
                <label className="form-label">Fecha límite</label>
                <input type="date" className="form-control" value={form.deadline}
                onChange={e => handleChange('deadline', e.target.value)} />
            </div>
            <div className="col-12">
                <label className="form-label">Comentarios</label>
                <textarea className="form-control" rows="2" value={form.comments}
                onChange={e => handleChange('comments', e.target.value)} />
            </div>
            <div className="col-12">
                <label className="form-label">Meta</label>
                <input className="form-control" value={form.goal}
                onChange={e => handleChange('goal', e.target.value)} />
            </div>
            <div className="col-12">
                <label className="form-label">Acciones</label>
                <input className="form-control" value={form.actions}
                onChange={e => handleChange('actions', e.target.value)} />
            </div>
            <div className="col-12">
                <label className="form-label">Indicadores</label>
                <input className="form-control" value={form.indicators}
                    onChange={e => handleChange('indicators', e.target.value)} />
            </div>
            </div>

            <button type="submit" className="btn btn-success mt-3" disabled={guardando}>
                {guardando ? 'Enviando...' : `Enviar a ${seleccionados.length} docente${seleccionados.length === 1 ? '' : 's'}`}
            </button>
        </form>

        {/* Historial */}
        <h6 className="text-uppercase text-muted fw-semibold mb-3" style={rotulo}>
            Retroalimentaciones colectivas enviadas
        </h6>
        {cargando ? (
            <p className="text-muted">Cargando...</p>
        ) : historial.length === 0 ? (
            <p className="text-muted">Aún no se ha enviado ninguna retroalimentación colectiva.</p>
        ) : (
            historial.map(f => (
            <div key={f._id} className="border rounded p-3 mb-3">
                <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="badge bg-secondary">Periodo {f.period}</span>
                <small className="text-muted">{new Date(f.createdAt).toLocaleDateString('es-ES')}</small>
                </div>
                <div className="mb-2">
                <small className="text-muted me-2">Dirigida a:</small>
                {(f.teacherIds || []).map(id => (
                    <span key={id} className="badge bg-light text-dark border me-1">{nombreDe(id)}</span>
                ))}
                </div>
                {f.comments && <p className="mb-2">{f.comments}</p>}
                <p className="mb-1"><strong>Meta:</strong> {f.goal}</p>
                <p className="mb-1"><strong>Acciones:</strong> {f.actions}</p>
                <p className="mb-1"><strong>Indicadores:</strong> {f.indicators}</p>
                <p className="mb-0"><strong>Fecha límite:</strong> {new Date(f.deadline).toLocaleDateString('es-ES')}</p>
            </div>
            ))
        )}
        </div>
    </div>
    )
}