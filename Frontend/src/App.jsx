import { useEffect, useRef, useState } from 'react'
import { SignedIn, SignedOut, useUser, useAuth, useClerk } from '@clerk/clerk-react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import api, { setTokenProvider } from './api/axios.js'
import LoginPage from './pages/LoginPage.jsx'
import StudentPage from './pages/StudentPage.jsx'
import TeacherPage from './pages/TeacherPage.jsx'
import DirectorPage from './pages/DirectorPage.jsx'

function AuthenticatedApp() {
  const { getToken } = useAuth()
  const { user, isLoaded } = useUser()
  const [asignandoRol, setAsignandoRol] = useState(false)
  const [errorRol, setErrorRol] = useState('')

  const { signOut } = useClerk()

  // Cada peticion a la API pide a Clerk un token vigente (ver api/axios.js).
  // Se registra durante el render (no en un useEffect) para que ya este listo
  // cuando las paginas hijas hagan sus primeras peticiones: los efectos de los
  // hijos corren ANTES que los del padre.
  setTokenProvider(getToken)

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
        const { data } = await api.post('/api/auth/update-role', {})
        // Solo recargamos si el rol cambió respecto al que ya tenía la sesión.
        if (data?.role && data.role !== user.publicMetadata?.role) {
          await user.reload()
          // Forzar un token nuevo que ya traiga el rol actualizado;
          // las siguientes peticiones lo toman de la cache de Clerk.
          await getToken({ skipCache: true })
        }
      } catch (err) {
        console.log('Error sincronizando rol:', err)
        // 403 = el backend rechazó el correo; cualquier otra cosa = problema de conexión
        setErrorRol(err?.response?.status === 403 ? 'correo' : 'conexion')
      } finally {
        setAsignandoRol(false)
      }
    }
    sincronizarRol()
  }, [isLoaded, user, getToken])

  if (!isLoaded || asignandoRol) return <div className="container mt-5 text-center">
    <div className="spinner-border text-primary" role="status"></div>
    <p className="mt-2">Cargando...</p>
  </div>

  const role = user?.publicMetadata?.role
  if (!role) return (
    <div className="container mt-5" style={{ maxWidth: 520 }}>
      <div className="alert alert-warning">
        {errorRol === 'conexion'
          ? <>No pudimos conectar con el servidor. Revisa tu conexión a internet e intenta de nuevo.</>
          : <>No pudimos darte acceso. Debes entrar con tu correo institucional <strong>@unal.edu.co</strong>.</>}
      </div>
      {errorRol === 'conexion' && (
        <button className="btn btn-primary me-2" onClick={() => window.location.reload()}>
          Reintentar
        </button>
      )}
      <button className="btn btn-outline-secondary" onClick={() => signOut()}>
        Cerrar sesión e intentar con otra cuenta
      </button>
    </div>
  )

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
