import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { getReembolsos, activarReembolsos, confirmarReembolsos } from '@/api/reembolsos'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { StatusCircle } from '@/components/ui/StatusCircle'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { ReembolsoDto } from '@/types'

function EstadoBadge({ estado }: { estado: ReembolsoDto['estado'] }) {
  const variants = {
    SinReembolso: 'warning',
    EnProceso: 'default',
    Reembolsado: 'success',
  } as const
  return <Badge variant={variants[estado]}>{estado}</Badge>
}

export function ReembolsosPage() {
  const { user } = useAuthStore()
  const cajaId = user?.cajaId!
  const queryClient = useQueryClient()
  const isDirector = user?.rol === 'Director'

  const { data, isLoading } = useQuery({
    queryKey: ['reembolsos', cajaId],
    queryFn: () => getReembolsos(cajaId),
  })

  const activarMutation = useMutation({
    mutationFn: () => activarReembolsos(cajaId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reembolsos', cajaId] })
      queryClient.invalidateQueries({ queryKey: ['legalizaciones', cajaId] })
    },
  })

  const confirmarMutation = useMutation({
    mutationFn: () => confirmarReembolsos(cajaId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reembolsos', cajaId] })
      queryClient.invalidateQueries({ queryKey: ['legalizaciones', cajaId] })
    },
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Cargando reembolsos...</p>
      </div>
    )
  }

  const sinReembolso = data?.sinReembolso ?? []
  const historico = data?.historico ?? []
  const totalPendiente = data?.totalPendiente ?? 0
  const enProceso = historico.filter(r => r.estado === 'EnProceso')
  const reembolsados = historico.filter(r => r.estado === 'Reembolsado')

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Sala de Reembolsos</h2>
        <p className="text-sm text-gray-500 mt-0.5">Gestión del proceso de reembolsos</p>
      </div>

      {/* Pending — SinReembolso */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <StatusCircle estado="SinReembolso" size="sm" />
              Pendientes de iniciar ({sinReembolso.length})
            </CardTitle>
            <div className="flex items-center gap-3">
              {sinReembolso.length > 0 && (
                <span className="text-sm font-medium text-gray-700">
                  Total: {formatCurrency(totalPendiente)}
                </span>
              )}
              {isDirector && (
              <Button
                size="sm"
                loading={activarMutation.isPending}
                disabled={sinReembolso.length === 0}
                onClick={() => activarMutation.mutate()}
              >
                Activar reembolsos
              </Button>
            )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {sinReembolso.length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center">No hay reembolsos pendientes de iniciar.</p>
          ) : (
            <ReembolsoTable reembolsos={sinReembolso} />
          )}
        </CardContent>
      </Card>

      {/* En proceso */}
      {enProceso.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <StatusCircle estado="EnProceso" size="sm" />
                En proceso ({enProceso.length})
              </CardTitle>
              {isDirector && (
                <Button
                  size="sm"
                  variant="success"
                  loading={confirmarMutation.isPending}
                  onClick={() => confirmarMutation.mutate()}
                >
                  Confirmar reembolsos
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <ReembolsoTable reembolsos={enProceso} />
          </CardContent>
        </Card>
      )}

      {/* Histórico — Reembolsados */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <StatusCircle estado="Reembolsado" size="sm" />
            Reembolsados ({reembolsados.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {reembolsados.length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center">No hay reembolsos confirmados aún.</p>
          ) : (
            <ReembolsoTable reembolsos={reembolsados} showConfirmacion />
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function ReembolsoTable({
  reembolsos,
  showConfirmacion = false,
}: {
  reembolsos: ReembolsoDto[]
  showConfirmacion?: boolean
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left">
            <th className="pb-3 pr-4 font-medium text-gray-500">Legalización</th>
            <th className="pb-3 pr-4 font-medium text-gray-500">Avance</th>
            <th className="pb-3 pr-4 font-medium text-gray-500">Central</th>
            <th className="pb-3 pr-4 font-medium text-gray-500">V. Avance</th>
            <th className="pb-3 pr-4 font-medium text-gray-500">V. Legalizado</th>
            <th className="pb-3 pr-4 font-medium text-gray-500">Ellos Deben</th>
            <th className="pb-3 pr-4 font-medium text-gray-500">Debemos</th>
            <th className="pb-3 pr-4 font-medium text-gray-500">Monto</th>
            <th className="pb-3 pr-4 font-medium text-gray-500">Estado</th>
            {showConfirmacion && <th className="pb-3 font-medium text-gray-500">Confirmado</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {reembolsos.map((r) => (
            <tr key={r.id} className="hover:bg-gray-50">
              <td className="py-3 pr-4 font-mono text-xs text-teal-700">{r.codigoLegalizacion}</td>
              <td className="py-3 pr-4">
                {r.codigoAvance ? (
                  <span className="font-mono text-xs">{r.codigoAvance}</span>
                ) : (
                  <span className="text-gray-400 text-xs">—</span>
                )}
              </td>
              <td className="py-3 pr-4 text-xs">{r.codigoCentral}</td>
              <td className="py-3 pr-4">{formatCurrency(r.valorAvance)}</td>
              <td className="py-3 pr-4">{formatCurrency(r.valorLegalizado)}</td>
              <td className="py-3 pr-4 text-orange-600">{formatCurrency(r.debe)}</td>
              <td className="py-3 pr-4 text-teal-600">{formatCurrency(r.debemos)}</td>
              <td className="py-3 pr-4 font-semibold">{formatCurrency(r.monto)}</td>
              <td className="py-3 pr-4">
                <div className="flex items-center gap-1.5">
                  <StatusCircle estado={r.estado} size="sm" />
                  <EstadoBadge estado={r.estado} />
                </div>
              </td>
              {showConfirmacion && (
                <td className="py-3 text-xs text-gray-500">
                  {r.fechaConfirmacion ? formatDate(r.fechaConfirmacion) : '—'}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
