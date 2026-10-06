import { useEffect, useRef, useState } from 'react'
import { SignedIn, SignedOut, useUser, useAuth } from '@clerk/clerk-react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import api, { setAuthToken } from './api/axios.js'
import LoginPage from './pages/LoginPage.jsx'
import StudentPage from './pages/StudentPage.jsx'
import TeacherPage from './pages/TeacherPage.jsx'
import DirectorPage from './pages/DirectorPage.jsx'

function AuthenticatedApp() {
  const { getToken } = useAuth()
  const { user, isLoaded } = useUser()
  const [tokenReady, setTokenReady] = useState(false)
  const [asignandoRol, setAsignandoRol] = useState(false)

  // Mantener el token de axios al día.
  useEffect(() => {
    const updateToken = async () => {
      const token = await getToken()
      setAuthToken(token)
      setTokenReady(true)
    }
    updateToken()
    const interval = setInterval(updateToken, 50000)
    return () => clearInterval(interval)
  }, [getToken])

  // En cada ingreso sincronizamos el rol con el padrón (el backend lo deriva del correo).
  // El ref garantiza que corra una sola vez por usuario, incluso con el doble montaje de StrictMode.
  const rolSincronizado = useRef(null)
  useEffect(() => {
    if (!isLoaded || !user) return
    if (rolSincronizado.current === user.id) return
    rolSincronizado.current = user.id

    const sincronizarRol = async () => {
      setAsignandoRol(true)
      try {
        const token = await getToken()
        const { data } = await api.post('/api/auth/update-role', {}, {
          headers: { Authorization: `Bearer ${token}` }
        })
        // Solo recargamos si el rol cambió respecto al que ya tenía la sesión.
        if (data?.role && data.role !== user.publicMetadata?.role) {
          await user.reload()
          const fresco = await getToken({ skipCache: true })
          setAuthToken(fresco)
        }
      } catch (err) {
        console.log('Error sincronizando rol:', err)
      } finally {
        setAsignandoRol(false)
      }
    }
    sincronizarRol()
  }, [isLoaded, user, getToken])

  if (!isLoaded || !tokenReady || asignandoRol) return <div className="container mt-5 text-center">
    <div className="spinner-border text-primary" role="status"></div>
    <p className="mt-2">Cargando...</p>
  </div>

  const role = user?.publicMetadata?.role
  if (!role) return <div className="container mt-5"><div className="alert alert-warning">No pudimos asignar tu rol. Verifica que tu correo institucional esté registrado, o contacta al administrador.</div></div>

  return (
    <Routes>
      <Route path="/student" element={role === 'estudiante' ? <StudentPage /> : <Navigate to="/login" />} />
      <Route path="/teacher" element={role === 'docente' ? <TeacherPage /> : <Navigate to="/login" />} />
      <Route path="/director" element={role === 'directivo' ? <DirectorPage /> : <Navigate to="/login" />} />
      <Route path="*" element={
        role === 'estudiante' ? <Navigate to="/student" /> :
        role === 'docente' ? <Navigate to="/teacher" /> :
        role === 'directivo' ? <Navigate to="/director" /> :
        <Navigate to="/login" />
      } />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={
          <>
            <SignedOut><LoginPage /></SignedOut>
            <SignedIn><Navigate to="/" /></SignedIn>
          </>
        } />
        <Route path="/*" element={
          <>
            <SignedOut><Navigate to="/login" /></SignedOut>
            <SignedIn><AuthenticatedApp /></SignedIn>
          </>
        } />
      </Routes>
    </BrowserRouter>
  )
}