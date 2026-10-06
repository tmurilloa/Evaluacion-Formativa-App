export default function DirectorFeedbackCard({ feedback }) {
    if (!feedback || feedback.length === 0) return null

    return (
    <div className="card mt-4">
        <div className="card-header role-teacher">
        <h5 className="mb-0"><i className="bi bi-inbox me-2"></i>Retroalimentación de la Dirección</h5>
        </div>
        <div className="card-body">
        {feedback.map(f => (
            <div key={f._id} className="border rounded p-3 mb-3">
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
        ))}
        </div>
    </div>
    )
}