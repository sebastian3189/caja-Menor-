import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { getDashboard } from '@/api/cajaMenor'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { formatCurrency, formatDate } from '@/lib/utils'

export function DashboardPage() {
  const { user } = useAuthStore()
  const cajaId = user?.cajaId

  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard', cajaId],
    queryFn: () => getDashboard(cajaId!),
    enabled: !!cajaId,
  })

  if (!cajaId) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-gray-700 font-medium">No tiene una caja asignada</p>
          <p className="text-sm text-gray-500 mt-1">Contacte al Director para que le asigne una caja desde el panel de administración.</p>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Cargando dashboard...</p>
      </div>
    )
  }

  if (error || !data) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const apiMsg = (error as any)?.response?.data?.message || (error as any)?.response?.data?.detail || ''
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center max-w-md">
          <p className="text-red-500 font-medium">Error al cargar la información de la caja.</p>
          {apiMsg && <p className="text-sm text-red-400 mt-1 font-mono">{apiMsg}</p>}
          <p className="text-sm text-gray-500 mt-2">CajaId: {cajaId} — Verifique que el backend esté activo.</p>
        </div>
      </div>
    )
  }

  const { caja, avances, legalizaciones } = data

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{caja.nombre}</h2>
          <p className="text-sm text-gray-500 mt-0.5">Panel de control</p>
        </div>
        <Badge variant={caja.estado === 'Abierta' ? 'success' : 'secondary'}>
          {caja.estado}
        </Badge>
      </div>

      {/* Caja info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-gray-500">Valor de Apertura</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(caja.valorApertura)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-gray-500">Disponible</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-teal-600">{formatCurrency(caja.disponible)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-gray-500">Total Usado</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-orange-600">{formatCurrency(caja.totalUsado)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Avances</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total registrados</span>
              <span className="font-semibold">{avances.total}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Pendientes de legalizar</span>
              <Badge variant="warning">{avances.pendientes}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Legalizados</span>
              <Badge variant="success">{avances.legalizados}</Badge>
            </div>
            {avances.total > 0 && (
              <div className="mt-2">
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-teal-500 rounded-full transition-all"
                    style={{ width: `${avances.porcentajeLegalizados}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {avances.porcentajeLegalizados.toFixed(0)}% legalizados
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Legalizaciones</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total registradas</span>
              <span className="font-semibold">{legalizaciones.total}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Sin avance asociado</span>
              <Badge variant="warning">{legalizaciones.sinAvance}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Con avance asociado</span>
              <Badge variant="success">{legalizaciones.conAvance}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Caja details */}
      <Card>
        <CardHeader>
          <CardTitle>Información de la Caja</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <dt className="text-xs text-gray-500">Central</dt>
              <dd className="text-sm font-medium text-gray-900 mt-0.5">
                {caja.nombreCentral}
                {caja.codigoCentral && (
                  <span className="ml-1.5 text-xs text-gray-400 font-mono">({caja.codigoCentral})</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Director</dt>
              <dd className="text-sm font-medium text-gray-900 mt-0.5">{caja.nombreDirector}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Administrador(es)</dt>
              <dd className="text-sm font-medium text-gray-900 mt-0.5">{caja.nombreAdministrador}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Fecha de apertura</dt>
              <dd className="text-sm font-medium text-gray-900 mt-0.5">{formatDate(caja.fechaApertura)}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Estado</dt>
              <dd className="mt-0.5">
                <Badge variant={caja.estado === 'Abierta' ? 'success' : 'secondary'}>
                  {caja.estado}
                </Badge>
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  )
}
