import { SignIn } from '@clerk/clerk-react'

export default function LoginPage() {
  return (
    <div className="container mt-5 d-flex flex-column align-items-center">
      <h4 className="mb-4 text-center">Evaluación Formativa Docente</h4>
      <SignIn routing="virtual" fallbackRedirectUrl="/" />
    </div>
  )
}