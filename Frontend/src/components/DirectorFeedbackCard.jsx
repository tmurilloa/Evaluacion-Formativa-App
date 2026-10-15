const rotulo = { fontSize: '0.75rem', letterSpacing: '0.08em' }

function FeedbackItem({ f }) {
    return (
        <div className="border rounded p-3 mb-3">
        <div className="d-flex justify-content-between align-items-center mb-2">
            <span className="badge bg-secondary">Periodo {f.period}</span>
            <small className="text-muted">{new Date(f.createdAt).toLocaleDateString('es-ES')}</small>
        </div>
        {f.comments && <p className="mb-2">{f.comments}</p>}
        <p className="mb-1"><strong>Meta:</strong> {f.goal}</p>
        <p className="mb-1"><strong>Acciones:</strong> {f.actions}</p>
        <p className="mb-1"><strong>Indicadores:</strong> {f.indicators}</p>
        <p className="mb-0"><strong>Fecha límite:</strong> {new Date(f.deadline).toLocaleDateString('es-ES')}</p>
    </div>
    )
}

export default function DirectorFeedbackCard({ feedback }) {
    if (!feedback || feedback.length === 0) return null

  // Los documentos anteriores a esta funcion no tienen scope: son individuales
    const individuales = feedback.filter(f => f.scope !== 'colectiva')
    const colectivas = feedback.filter(f => f.scope === 'colectiva')

    return (
        <div className="card mt-4">
            <div className="card-header role-teacher">
                <h5 className="mb-0"><i className="bi bi-inbox me-2"></i>Retroalimentación de la Dirección</h5>
        </div>
        <div className="card-body">
        {individuales.length > 0 && (
            <section className={colectivas.length > 0 ? 'mb-4' : ''}>
                <h6 className="text-uppercase text-muted fw-semibold mb-1" style={rotulo}>
                    <i className="bi bi-person me-2"></i>Retroalimentación individual
            </h6>
            <p className="text-muted small mb-3">Dirigida únicamente a usted.</p>
            {individuales.map(f => <FeedbackItem key={f._id} f={f} />)}
            </section>
        )}

        {colectivas.length > 0 && (
            <section>
                <h6 className="text-uppercase text-muted fw-semibold mb-1" style={rotulo}>
                    <i className="bi bi-people me-2"></i>Retroalimentación colectiva
                </h6>
                <p className="text-muted small mb-3">Compartida con un grupo de docentes.</p>
                {colectivas.map(f => <FeedbackItem key={f._id} f={f} />)}
            </section>
            )}
        </div>
    </div>
    )
}