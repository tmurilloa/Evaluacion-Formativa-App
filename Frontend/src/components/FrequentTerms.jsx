import { frequentTerms, frequentBigrams } from '../utils/textAnalysis.js'
import { COLORES_CHIP } from '../theme.js'
import { TERMINOS_TOP_N, TERMINO_LONGITUD_MINIMA, BIGRAMAS_TOP_N, BIGRAMA_FRECUENCIA_MINIMA } from '../config/umbrales.js'

function Chips({ items, max }) {
    return (
        <div className="d-flex flex-wrap gap-2">
        {items.map(t => (
            <span
                key={t.term}
                className="badge rounded-pill"
                style={{
                    backgroundColor: COLORES_CHIP.fondo,
                    color: COLORES_CHIP.texto,
                    border: `1px solid ${COLORES_CHIP.borde}`,
                    fontWeight: 500,
                    fontSize: `${(0.72 + 0.28 * (t.count / max)).toFixed(2)}rem`
                }}
        >
            {t.term} <span style={{ opacity: 0.55 }}>·{t.count}</span>
        </span>
        ))}
    </div>
    )
}

export default function FrequentTerms({ answers }) {
    const terms = frequentTerms(answers, TERMINOS_TOP_N, TERMINO_LONGITUD_MINIMA)
    const bigrams = frequentBigrams(answers, BIGRAMAS_TOP_N, BIGRAMA_FRECUENCIA_MINIMA)

    if (terms.length === 0) return null

    const rotulo = { fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em' }

    return (
        <div className="mb-3">
            <p className="text-muted mb-1" style={rotulo}>Términos frecuentes</p>
            <Chips items={terms} max={terms[0].count} />

            {bigrams.length > 0 && (
            <>
                <p className="text-muted mb-1 mt-2" style={rotulo}>Expresiones frecuentes</p>
                <Chips items={bigrams} max={bigrams[0].count} />
            </>
        )}
    </div>
    )
}