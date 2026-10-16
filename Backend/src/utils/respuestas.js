// Texto que se guarda cuando una pregunta abierta se deja en blanco.
// Las preguntas abiertas son opcionales; las de escala (likert) siguen siendo obligatorias.
export const SIN_RESPUESTA = 'N/A'

// true si la respuesta abierta esta vacia o solo tiene espacios
export const estaEnBlanco = (texto) => typeof texto !== 'string' || !texto.trim()

// Separa una lista de respuestas abiertas en las que tienen texto y el conteo de "N/A".
// Las "N/A" no se muestran una por una: solo se informa cuantos no respondieron.
export function separarRespuestas(lista) {
    const conTexto = (lista || []).filter(a => !estaEnBlanco(a))
    const answers = conTexto.filter(a => a.trim() !== SIN_RESPUESTA)
    return { answers, sinRespuesta: conTexto.length - answers.length }
}