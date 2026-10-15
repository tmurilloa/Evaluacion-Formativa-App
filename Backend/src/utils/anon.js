import crypto from 'crypto'

// Convierte un correo en un código irreversible (HMAC-SHA256 con un secreto del servidor).
// El mismo correo siempre da el mismo código, pero sin el secreto no se puede saber de quién es.
// IMPORTANTE: si el secreto cambia, los códigos cambian y el sistema deja de reconocer
// las evaluaciones e inscripciones ya guardadas. No lo cambies durante el piloto.
export function hashEmail(email) {
    const secret = process.env.EVAL_HASH_SECRET
    if (!secret) {
        // Mejor fallar que calcular códigos con un secreto vacío sin que nadie lo note
        throw new Error('Falta EVAL_HASH_SECRET en las variables de entorno')
    }
    const normalizado = (email || '').trim().toLowerCase()
    return crypto.createHmac('sha256', secret).update(normalizado).digest('hex')
}

// Huella corta del secreto: permite comprobar que el servidor y los scripts
// usan EL MISMO secreto sin revelarlo. Debe coincidir en /api/health y en
// la salida de npm run piloto:cargar.
export function huellaSecreto() {
    return hashEmail('huella@verificacion.local').slice(0, 8)
}
