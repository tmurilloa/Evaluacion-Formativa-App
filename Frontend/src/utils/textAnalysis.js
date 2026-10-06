// Analisis simple de texto para respuestas abiertas (en el cliente, sin IA)

// Palabras vacias en español + muletillas del dominio que no aportan
const STOPWORDS = new Set([
    'el','la','los','las','un','una','unos','unas','de','del','al','a','ante','con','contra',
    'en','entre','hacia','hasta','para','por','segun','sin','sobre','tras','y','e','o','u','ni',
    'que','se','su','sus','le','les','lo','me','mi','mis','te','tu','tus','nos','es','son','ser',
    'muy','mas','pero','como','porque','cuando','donde','tambien','ya','si','no','mucho','poco',
    'todo','todos','toda','todas','algo','este','esta','estos','estas','ese','esa','esos','esas',
    'hay','ha','han','he','fue','era','yo','profe','profesor','profesora','clase','clases',
    'curso','cursos','estudiante','estudiantes'
])

// minusculas y sin tildes
function normalize(word) {
    return word
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zñ]/g, '')
}

// Terminos mas frecuentes de una lista de respuestas de texto
export function frequentTerms(answers, topN = 8, minLength = 4) {
    const counts = {}
    ;(answers || []).forEach(text => {
    if (!text) return
    text.split(/\s+/).forEach(raw => {
        const w = normalize(raw)
        if (w.length < minLength || STOPWORDS.has(w)) return
        counts[w] = (counts[w] || 0) + 1
    })
    })
    return Object.entries(counts)
    .map(([term, count]) => ({ term, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, topN)
}
// Bigramas: pares de palabras consecutivas. Capturan lo que las palabras
// sueltas pierden ("no explica", "muy claro", "poco tiempo").
export function frequentBigrams(answers, topN = 5, minCount = 2) {
    const counts = {}

    ;(answers || []).forEach(text => {
    if (!text) return

    // Cortar en limites de oracion: la ultima palabra de una frase y la
    // primera de la siguiente no son realmente adyacentes.
    text.split(/[.;:!?\n]+/).forEach(frase => {
        const words = frase.split(/\s+/).map(normalize).filter(Boolean)

        for (let i = 0; i < words.length - 1; i++) {
            const a = words[i]
            const b = words[i + 1]
            if (a.length < 2 || b.length < 2) continue
            // Se descarta solo si AMBAS son vacias ("de la", "que se").
            // Asi sobrevive "no explica", que es justo lo que interesa.
            if (STOPWORDS.has(a) && STOPWORDS.has(b)) continue
            const par = `${a} ${b}`
            counts[par] = (counts[par] || 0) + 1
        }
    })
    })

    return Object.entries(counts)
        .map(([term, count]) => ({ term, count }))
        .filter(t => t.count >= minCount)
        .sort((a, b) => b.count - a.count)
        .slice(0, topN)
}