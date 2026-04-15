import { Routes, Route, Navigate } from 'react-router-dom'
import { LoginPage } from '@/pages/LoginPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { AvancesPage } from '@/pages/AvancesPage'
import { LegalizacionesPage } from '@/pages/LegalizacionesPage'
import { ReembolsosPage } from '@/pages/ReembolsosPage'
import { ArqueoPage } from '@/pages/ArqueoPage'
import { AppLayout } from '@/components/layout/AppLayout'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      {/* Authenticated routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/avances" element={<AvancesPage />} />
          <Route path="/legalizaciones" element={<LegalizacionesPage />} />
          <Route path="/arqueo" element={<ArqueoPage />} />

          {/* Director-only */}
          <Route element={<ProtectedRoute allowedRoles={['Director']} />}>
            <Route path="/reembolsos" element={<ReembolsosPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
