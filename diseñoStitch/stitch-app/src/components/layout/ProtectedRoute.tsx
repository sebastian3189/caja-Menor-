import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

interface ProtectedRouteProps {
  allowedRoles?: string[]
}

/** Ruta "home" a la que se redirige cada rol cuando no tiene permiso sobre la ruta actual. */
export function rutaHomePorRol(rol?: string): string {
  if (rol === 'Maestro') return '/maestro/usuarios'
  if (rol === 'Solicitante') return '/solicitante/solicitar'
  return '/dashboard'
}

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuthStore()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // Primer ingreso: obligar a cambiar la contraseña antes de usar cualquier otra pantalla
  if (user?.mustChangePassword && location.pathname !== '/cambiar-password') {
    return <Navigate to="/cambiar-password" replace />
  }

  if (allowedRoles && user?.rol && !allowedRoles.includes(user.rol)) {
    return <Navigate to={rutaHomePorRol(user.rol)} replace />
  }

  return <Outlet />
}
