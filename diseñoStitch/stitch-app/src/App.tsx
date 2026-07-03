import { Routes, Route, Navigate } from 'react-router-dom'
import { LoginPage } from '@/pages/LoginPage'
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage'
import { ResetPasswordPage } from '@/pages/ResetPasswordPage'
import { CambiarPasswordPage } from '@/pages/CambiarPasswordPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { AvancesPage } from '@/pages/AvancesPage'
import { LegalizacionesPage } from '@/pages/LegalizacionesPage'
import { ReembolsosPage } from '@/pages/ReembolsosPage'
import { ArqueoPage } from '@/pages/ArqueoPage'
import { AuditoriaPage } from '@/pages/AuditoriaPage'
import { MaestroUsuariosPage } from '@/pages/maestro/MaestroUsuariosPage'
import { MaestroCentralesPage } from '@/pages/maestro/MaestroCentralesPage'
import { MaestroCajasPage } from '@/pages/maestro/MaestroCajasPage'
import { SolicitudesAdminPage } from '@/pages/SolicitudesAdminPage'
import { SolicitanteSolicitarPage } from '@/pages/solicitante/SolicitanteSolicitarPage'
import { SolicitanteMisSolicitudesPage } from '@/pages/solicitante/SolicitanteMisSolicitudesPage'
import { AppLayout } from '@/components/layout/AppLayout'
import { ProtectedRoute, rutaHomePorRol } from '@/components/layout/ProtectedRoute'
import { useAuthStore } from '@/store/authStore'

/** Redirige a la ruta "home" del rol del usuario logueado, o a /login si no hay sesión. */
function HomeRedirect() {
  const { isAuthenticated, user } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <Navigate to={rutaHomePorRol(user?.rol)} replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      <Route element={<ProtectedRoute />}>
        {/* Cambio de contraseña forzado (primer ingreso) — pantalla completa, sin sidebar */}
        <Route path="/cambiar-password" element={<CambiarPasswordPage />} />

        <Route element={<AppLayout />}>
          {/* Operación diaria de la caja: Director y Administrador */}
          <Route element={<ProtectedRoute allowedRoles={['Director', 'Administrador']} />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/avances" element={<AvancesPage />} />
            <Route path="/legalizaciones" element={<LegalizacionesPage />} />
            <Route path="/arqueo" element={<ArqueoPage />} />
            <Route path="/reembolsos" element={<ReembolsosPage />} />
          </Route>
          {/* Solicitudes de avance: solo Administrador */}
          <Route element={<ProtectedRoute allowedRoles={['Administrador']} />}>
            <Route path="/solicitudes" element={<SolicitudesAdminPage />} />
          </Route>
          {/* Auditoría: Maestro (todo el sistema) y Director (solo su caja) */}
          <Route element={<ProtectedRoute allowedRoles={['Director', 'Maestro']} />}>
            <Route path="/auditoria" element={<AuditoriaPage />} />
          </Route>
          {/* Panel Solicitante */}
          <Route element={<ProtectedRoute allowedRoles={['Solicitante']} />}>
            <Route path="/solicitante/solicitar" element={<SolicitanteSolicitarPage />} />
            <Route path="/solicitante/mis-solicitudes" element={<SolicitanteMisSolicitudesPage />} />
          </Route>
          {/* Panel Maestro: gobernanza de usuarios, centrales y cajas */}
          <Route element={<ProtectedRoute allowedRoles={['Maestro']} />}>
            <Route path="/maestro/usuarios" element={<MaestroUsuariosPage />} />
            <Route path="/maestro/centrales" element={<MaestroCentralesPage />} />
            <Route path="/maestro/cajas" element={<MaestroCajasPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<HomeRedirect />} />
    </Routes>
  )
}
