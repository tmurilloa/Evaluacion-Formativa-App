import crypto from 'crypto'

// Convierte un correo en un código irreversible (HMAC-SHA256 con un secreto del servidor).
// El mismo correo siempre da el mismo código, pero sin el secreto no se puede saber de quién es.
export function hashEmail(email) {
    const secret = process.env.EVAL_HASH_SECRET || ''
    const normalizado = (email || '').trim().toLowerCase()
    return crypto.createHmac('sha256', secret).update(normalizado).digest('hex')
}