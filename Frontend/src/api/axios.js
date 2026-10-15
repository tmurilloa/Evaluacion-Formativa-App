import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 20000   // si el servidor no responde en 20 s, fallar en vez de quedarse colgado
})

// Instancia sin auth para registro
export const publicApi = axios.create({
  baseURL: BASE_URL
})

// Antes de CADA peticion se le pide a Clerk un token vigente. Clerk lo entrega
// de su cache si sigue valido y lo renueva si ya vencio (por ejemplo, si el
// estudiante bloqueo el celular o dejo la pestaña en segundo plano).
// Antes se renovaba con un temporizador cada 50 s, y los navegadores frenan
// esos temporizadores en pestañas inactivas: el token vencia y las respuestas
// se perdian con un 401.
let obtenerToken = null

export const setTokenProvider = (fn) => {
  obtenerToken = fn
}

api.interceptors.request.use(async (config) => {
  if (obtenerToken) {
    const token = await obtenerToken()
    if (token) config.headers.set('Authorization', `Bearer ${token}`)
  }
  return config
})

export default api
