export const SIN_RESPUESTA = 'N/A'

// Separa una lista de respuestas abiertas en las que tienen texto y el conteo de "N/A".
// Las "N/A" no se muestran una por una: solo se informa cuantos no respondieron.
export function separarRespuestas(lista) {
    const conTexto = (lista || []).filter(a => typeof a === 'string' && a.trim())
    const answers = conTexto.filter(a => a.trim() !== SIN_RESPUESTA)
    return { answers, sinRespuesta: conTexto.length - answers.length }
}