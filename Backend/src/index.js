import 'dotenv/config'
import express from 'express'
import cors from 'cors'

import { connectDB } from './config/db.js'
import teachersRouter from './routes/teachers.js'
import questionsRouter from './routes/question.js'
import evaluationsRouter from './routes/evaluations.js'
import improvementPlansRouter from './routes/improvementPlans.js'
import directorStatsRouter from './routes/directorStats.js'
import authRouter from './routes/auth.js'
import cookieParser from 'cookie-parser'
import { rateLimit, ipKeyGenerator } from 'express-rate-limit'
import { huellaSecreto } from './utils/anon.js'



const app = express()
app.set('trust proxy', 1)
const PORT = process.env.PORT || 5000

// Origenes permitidos por CORS: lista separada por comas en FRONTEND_URL (dev y/o prod)
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean)
  console.log('CORS - orígenes permitidos:', allowedOrigins)

// Middlewares
app.use(cors({
  origin: (origin, callback) => {
    // Permitir herramientas sin origin (curl, Postman) y los origenes de la lista
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error(`Origen no permitido por CORS: ${origin}`))
    }
  },
  maxAge: 7200   // el navegador recuerda el permiso 2 h: menos peticiones OPTIONS
}))
app.use(express.json())
app.use(cookieParser())

// Limite de peticiones POR USUARIO, no por IP: en la universidad cientos de
// estudiantes salen a internet por la misma IP publica, y un limite por IP
// los bloquearia a todos a la vez.
// El token NO se verifica aqui (eso lo hace requireAuth despues): solo se usa
// para elegir el contador. Falsificarlo no da acceso a nada.
function claveLimite(req) {
  const auth = req.headers.authorization
  if (auth?.startsWith('Bearer ')) {
    try {
      const payload = JSON.parse(Buffer.from(auth.split('.')[1], 'base64url').toString('utf8'))
      if (payload?.sub) return `u:${payload.sub}`
    } catch { /* token malformado: se cuenta por IP */ }
  }
  return `ip:${ipKeyGenerator(req.ip)}`
}

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  limit: 600,               // por usuario: evaluar un docente son ~40 peticiones
  keyGenerator: claveLimite,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Demasiadas peticiones, intenta de nuevo en unos minutos.' }
})
app.use('/api', apiLimiter)

// Conectar a la base antes de atender cualquier ruta /api
app.use('/api', async (req, res, next) => {
  try {
    await connectDB()
    next()
  } catch (error) {
    console.error('Error al conectar a MongoDB:', error.message)
    res.status(503).json({ message: 'El servicio no está disponible en este momento. Intenta de nuevo en un minuto.' })
  }
})

// Routes 
app.use('/api/teachers', teachersRouter)
app.use('/api/questions', questionsRouter)
app.use('/api/evaluations', evaluationsRouter)
app.use('/api/improvement-plans', improvementPlansRouter)
app.use('/api/director-stats', directorStatsRouter)
app.use('/api/auth', authRouter)

// Test route
// Prueba de vida: confirma servidor + base de datos + secreto configurado.
// "huella" debe coincidir con la que imprime npm run piloto:cargar.
app.get('/api/health', (req, res) => {
  try {
    res.json({ status: 'ok', message: 'Servidor funcionando correctamente', huella: huellaSecreto() })
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message })
  }
})

// En tu computador: levantar el servidor.
// En Vercel no se llama a listen: Vercel usa la app exportada abajo.
if (!process.env.VERCEL) {
  connectDB()
    .then(() => {
      app.listen(PORT, () => {
        console.log(`Servidor corriendo en http://localhost:${PORT}`)
      })
    })
    .catch(error => {
      console.error('Error al conectar a MongoDB:', error.message)
      process.exit(1)
    })
}

export default app
