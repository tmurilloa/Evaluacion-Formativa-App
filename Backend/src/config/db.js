import mongoose from 'mongoose'

// Una sola conexion reutilizable. En Vercel la misma instancia de la funcion
// atiende muchas peticiones, asi que guardamos la promesa de conexion en vez
// de conectar en cada request.
let conexion = null

export function connectDB() {
  if (!conexion) {
    // Los indices se crean con los scripts (piloto:cargar / createEvaluationIndex),
    // nunca automaticamente en produccion.
    mongoose.set('autoIndex', process.env.NODE_ENV !== 'production')

    conexion = mongoose.connect(process.env.MONGODB_URI, {
      maxPoolSize: 10,                 // varias instancias x 10 << 500 conexiones de Atlas
      serverSelectionTimeoutMS: 10000  // fallar en 10 s en vez de colgarse
    })
      .then(m => {
        console.log('Conexión a MongoDB exitosa')
        return m
      })
      .catch(err => {
        conexion = null   // permitir reintentar en la siguiente peticion
        throw err
      })
  }
  return conexion
}
