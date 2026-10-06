import { BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts'
import { BRECHA_RELEVANTE } from '../config/umbrales.js'
import { COLORES_PUNTAJE, COLORES } from '../theme.js'
// Acorta nombres largos de categoria para que quepan en el radar
function shortLabel(cat) {
    const map = {
    'Carácter docente': 'Carácter',
    'Competencias pedagógicas': 'Pedagógicas',
    'Dominio disciplinar': 'Disciplinar',
    'Contexto': 'Contexto',
    'Producción de conocimiento pedagógico': 'Prod. conocimiento'
    }
    return map[cat] || cat
}




export default function TeacherDetailModal({ teacher, onClose }) {
    if (!teacher) return null

    const radarData = (teacher.categoryScores || []).map(c => ({
    category: shortLabel(c.category),
    Estudiantes: c.student,
    Autoevaluación: c.self
    }))

    const distData = [1, 2, 3, 4, 5].map(n => ({
    score: String(n),
    Respuestas: teacher.studentScoreDistribution?.[n] || 0
    }))
    const totalRespuestas = distData.reduce((a, b) => a + b.Respuestas, 0)

    return (
    <>
        <div className="modal-backdrop fade show" onClick={onClose} style={{ zIndex: 1040 }} />
        <div className="modal fade show d-block" style={{ zIndex: 1050 }} role="dialog" aria-modal="true">
        <div className="modal-dialog modal-xl modal-dialog-scrollable">
            <div className="modal-content">
            <div className="modal-header">
                <h5 className="modal-title">Detalle por categoría — {teacher.name}</h5>
                <button type="button" className="btn-close" onClick={onClose} aria-label="Cerrar" />
            </div>

            <div className="modal-body">
                {teacher.studentEvaluationCount === 0 ? (
                <p className="text-muted text-center py-3">
                    Este docente aún no tiene evaluaciones de estudiantes.
                </p>
                ) : (
                <>
                    <div className="row g-4">
                    <div className="col-lg-6">
                        <h6 className="text-uppercase text-muted fw-semibold mb-2" style={{ fontSize: '0.75rem', letterSpacing: '0.08em' }}>
                        Perfil por categoría
                        </h6>
                        <ResponsiveContainer width="100%" height={300}>
                        <RadarChart data={radarData}>
                            <PolarGrid />
                            <PolarAngleAxis dataKey="category" tick={{ fontSize: 11 }} />
                            <PolarRadiusAxis domain={[0, 5]} tick={{ fontSize: 10 }} />
                            <Radar name="Estudiantes" dataKey="Estudiantes" stroke={COLORES.verdeOscuro} fill={COLORES.verdeOscuro} fillOpacity={0.35} />
                            {teacher.hasSelfEvaluation && (
                            <Radar name="Autoevaluación" dataKey="Autoevaluación" stroke={COLORES.rojo} fill={COLORES.rojo} fillOpacity={0.15} />
                            )}
                            <Legend />
                            <Tooltip />
                        </RadarChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="col-lg-6">
                        <h6 className="text-uppercase text-muted fw-semibold mb-2" style={{ fontSize: '0.75rem', letterSpacing: '0.08em' }}>
                        Distribución de puntajes ({totalRespuestas} respuestas)
                        </h6>
                        <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={distData}>
                            <XAxis dataKey="score" />
                            <YAxis allowDecimals={false} />
                            <Tooltip />
                            <Bar dataKey="Respuestas">
                            {distData.map((_, i) => (
                                <Cell key={i} fill={COLORES_PUNTAJE[i]} />
                            ))}
                            </Bar>
                        </BarChart>
                        </ResponsiveContainer>
                    </div>
                    </div>

                    <h6 className="text-uppercase text-muted fw-semibold mt-4 mb-2" style={{ fontSize: '0.75rem', letterSpacing: '0.08em' }}>
                    Brecha autoevaluación vs. estudiantes
                    </h6>
                    <div className="table-responsive">
                    <table className="table table-sm table-striped align-middle">
                        <thead>
                        <tr>
                            <th>Categoría</th>
                            <th className="text-center">Estudiantes</th>
                            <th className="text-center">Autoevaluación</th>
                            <th className="text-center">Brecha</th>
                        </tr>
                        </thead>
                        <tbody>
                        {(teacher.categoryScores || []).map(c => {
                            const noSelf = !teacher.hasSelfEvaluation || c.self === 0
                            const noStudent = c.student === 0
                            return (
                            <tr key={c.category}>
                                <td>{c.category}</td>
                                <td className="text-center">{noStudent ? '-' : c.student}</td>
                                <td className="text-center">{noSelf ? '-' : c.self}</td>
                                <td className="text-center">
                                {noSelf || noStudent ? (
                                    <span className="text-muted">-</span>
                                ) : (
                                    <span className={`badge ${c.gap <= -BRECHA_RELEVANTE ? 'bg-danger' : c.gap >= BRECHA_RELEVANTE ? 'bg-success' : 'bg-secondary'}`}>
                                    {c.gap > 0 ? '+' : ''}{c.gap}
                                    </span>
                                )}
                                </td>
                            </tr>
                            )
                        })}
                        </tbody>
                    </table>
                    <p className="text-muted mb-0" style={{ fontSize: '0.8rem' }}>
                        Brecha = percepción estudiantil − autoevaluación. Un valor negativo (rojo) indica un posible punto ciego:
                        el docente se califica más alto de lo que perciben los estudiantes.
                    </p>
                    </div>
                </>
                )}
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