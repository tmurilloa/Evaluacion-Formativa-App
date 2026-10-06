import express from 'express'
import { createClerkClient } from '@clerk/backend'
import Teacher from '../models/Teacher.js'
import Roster from '../models/Roster.js'
import { requireAuth } from '../middleware/auth.js'



const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })

const router = express.Router()

router.post('/update-role', requireAuth, async (req, res) => {
  try {
    // La identidad sale del token verificado, nunca del cuerpo.
    const userId = req.userId
    const email = req.userEmail?.trim().toLowerCase()

    if (!email) {
      return res.status(400).json({ message: 'El token no incluye el correo del usuario' })
    }
    if (!email.endsWith('@unal.edu.co')) {
      return res.status(403).json({ message: 'Debes registrarte con tu correo institucional @unal.edu.co' })
    }

    // El padrón decide el rol; quien no aparezca es estudiante.
    const entry = await Roster.findOne({ email })
    const role = entry?.role || 'estudiante'

    const user = await clerkClient.users.updateUser(userId, {
      publicMetadata: { role }
    })

    // Si es docente, aseguramos su ficha en 'teachers' con los datos del padrón.
    if (role === 'docente') {
      const existing = await Teacher.findOne({ id: email })
      if (!existing) {
        await Teacher.create({ id: email, name: entry.name, subject: entry.subject || '' })
        console.log('Docente agregado a MongoDB:', email)
      }
    }

    res.status(200).json({
      success: true,
      message: 'Rol actualizado correctamente',
      role: user.publicMetadata.role
    })
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar el rol', error: error.message })
  }
})

export default router