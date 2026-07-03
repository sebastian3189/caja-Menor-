import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuthStore } from '@/store/authStore'
import { getAvances, getResumenAvances, crearAvance, getSiguienteCodigoAvance, eliminarAvance } from '@/api/avances'
import { getDashboard } from '@/api/cajaMenor'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { StatusCircle } from '@/components/ui/StatusCircle'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { AvanceDto } from '@/types'

const crearAvanceSchema = z.object({
  codigoAvance: z.string().min(1, 'Requerido'),
  fechaEnvio: z.string().min(1, 'Requerido'),
  valorAvance: z.string().min(1, 'Requerido').refine(v => !isNaN(Number(v)) && Number(v) > 0, 'Debe ser mayor a 0'),
  descripcion: z.string().min(1, 'Requerido'),
  solicitante: z.string().min(1, 'Requerido'),
})

type CrearAvanceForm = z.infer<typeof crearAvanceSchema>

function EstadoAvanceBadge({ estado }: { estado: AvanceDto['estado'] }) {
  return <Badge variant={estado === 'Pendiente' ? 'warning' : 'success'}>{estado}</Badge>
}

function TipoAvanceBadge({ tipo }: { tipo: AvanceDto['tipoAvance'] }) {
  if (!tipo) return <span className="text-gray-400 text-xs">—</span>
  const variants = { Total: 'default', Sobrante: 'warning', Faltante: 'destructive' } as const
  return <Badge variant={variants[tipo]}>{tipo}</Badge>
}

export function AvancesPage() {
  const { user } = useAuthStore()
  const cajaId = user?.cajaId!
  const queryClient = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const isAdmin = user?.rol === 'Administrador'

  const { data: avances = [], isLoading } = useQuery({
    queryKey: ['avances', cajaId],
    queryFn: () => getAvances(cajaId),
  })

  const { data: resumen } = useQuery({
    queryKey: ['resumen-avances', cajaId],
    queryFn: () => getResumenAvances(cajaId),
  })

  const { data: dashboard } = useQuery({
    queryKey: ['dashboard', cajaId],
    queryFn: () => getDashboard(cajaId),
  })

  const { data: siguienteCodigo } = useQuery({
    queryKey: ['siguiente-codigo-avance', cajaId],
    queryFn: () => getSiguienteCodigoAvance(cajaId),
    enabled: showModal && isAdmin,
    refetchOnMount: 'always',
  })

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CrearAvanceForm>({ resolver: zodResolver(crearAvanceSchema) })

  useEffect(() => {
    if (siguienteCodigo) setValue('codigoAvance', siguienteCodigo.codigo)
  }, [siguienteCodigo, setValue])

  const valorAvanceStr = watch('valorAvance')
  const valorAvance = Number(valorAvanceStr) || 0
  const disponible = dashboard?.caja.disponible ?? 0
  const quedaria = disponible - valorAvance
  const excedeTope = valorAvance > 0 && valorAvance > disponible

  const mutation = useMutation({
    mutationFn: (data: CrearAvanceForm) =>
      crearAvance(cajaId, { ...data, valorAvance: Number(data.valorAvance), cajaId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['avances', cajaId] })
      queryClient.invalidateQueries({ queryKey: ['resumen-avances', cajaId] })
      queryClient.invalidateQueries({ queryKey: ['dashboard', cajaId] })
      queryClient.invalidateQueries({ queryKey: ['siguiente-codigo-avance', cajaId] })
      setShowModal(false)
      reset()
      setApiError(null)
    },
    onError: (error: any) => {
      setApiError(error?.response?.data?.message ?? 'Error al crear el avance.')
    },
  })

  const eliminarMutation = useMutation({
    mutationFn: (avanceId: number) => eliminarAvance(cajaId, avanceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['avances', cajaId] })
      queryClient.invalidateQueries({ queryKey: ['resumen-avances', cajaId] })
      queryClient.invalidateQueries({ queryKey: ['dashboard', cajaId] })
    },
  })

  const onSubmit = (data: CrearAvanceForm) => {
    if (excedeTope) return
    setApiError(null)
    mutation.mutate(data)
  }

  const handleClose = () => {
    setShowModal(false)
    reset()
    setApiError(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Avances</h2>
          <p className="text-sm text-gray-500 mt-0.5">Gestión de avances de caja menor</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setShowModal(true)}>+ Nuevo avance</Button>
        )}
      </div>

      {resumen && (
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-gray-500">Total</p>
              <p className="text-2xl font-bold">{resumen.total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-gray-500">Pendientes</p>
              <p className="text-2xl font-bold text-yellow-600">{resumen.pendientes}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-gray-500">Legalizados</p>
              <p className="text-2xl font-bold text-green-600">{resumen.legalizados}</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Listado de avances</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-gray-500 py-8 text-center">Cargando...</p>
          ) : avances.length === 0 ? (
            <p className="text-sm text-gray-500 py-8 text-center">No hay avances registrados.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left">
                    <th className="pb-3 pr-4 font-medium text-gray-500">Código</th>
                    <th className="pb-3 pr-4 font-medium text-gray-500">Fecha</th>
                    <th className="pb-3 pr-4 font-medium text-gray-500">Solicitante</th>
                    <th className="pb-3 pr-4 font-medium text-gray-500">Valor</th>
                    <th className="pb-3 pr-4 font-medium text-gray-500">Estado</th>
                    <th className="pb-3 pr-4 font-medium text-gray-500">Tipo</th>
                    <th className="pb-3 font-medium text-gray-500">Reembolso</th>
                    {isAdmin && <th className="pb-3 pl-4 font-medium text-gray-500"></th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {avances.map((avance) => (
                    <tr key={avance.id} className="hover:bg-gray-50">
                      <td className="py-3 pr-4 font-mono font-medium text-teal-700">{avance.codigoAvance}</td>
                      <td className="py-3 pr-4 text-gray-600">{formatDate(avance.fechaEnvio)}</td>
                      <td className="py-3 pr-4 text-gray-700">{avance.solicitante}</td>
                      <td className="py-3 pr-4 font-medium">{formatCurrency(avance.valorAvance)}</td>
                      <td className="py-3 pr-4"><EstadoAvanceBadge estado={avance.estado} /></td>
                      <td className="py-3 pr-4"><TipoAvanceBadge tipo={avance.tipoAvance} /></td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <StatusCircle estado={avance.estadoReembolso} size="sm" />
                          <span className="text-xs text-gray-500">{avance.estadoReembolso}</span>
                        </div>
                      </td>
                      {isAdmin && (
                        <td className="py-3 pl-4">
                          {avance.estado === 'Pendiente' && (
                            <button
                              title="Eliminar avance pendiente"
                              className="text-gray-400 hover:text-red-500 transition-colors disabled:opacity-40"
                              disabled={eliminarMutation.isPending && eliminarMutation.variables === avance.id}
                              onClick={() => {
                                if (confirm(`¿Eliminar el avance ${avance.codigoAvance}? Esta acción devolverá el monto a la caja.`)) {
                                  eliminarMutation.mutate(avance.id)
                                }
                              }}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-start justify-between">
                <h3 className="text-lg font-semibold">Nuevo Avance</h3>
                {dashboard && (
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Disponible en caja</p>
                    <p className="text-base font-semibold text-teal-700">{formatCurrency(dashboard.caja.disponible)}</p>
                  </div>
                )}
              </div>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-4 space-y-4">
              <div className="space-y-1">
                <Label>Código avance</Label>
                <Input placeholder="REQ-0001" {...register('codigoAvance')} />
                {errors.codigoAvance && <p className="text-xs text-red-500">{errors.codigoAvance.message}</p>}
              </div>

              <div className="space-y-1">
                <Label>Fecha de envío</Label>
                <Input type="date" {...register('fechaEnvio')} />
                {errors.fechaEnvio && <p className="text-xs text-red-500">{errors.fechaEnvio.message}</p>}
              </div>

              <div className="space-y-1">
                <Label>Valor del avance</Label>
                <Input type="number" step="0.01" placeholder="0" {...register('valorAvance')} />
                {errors.valorAvance && <p className="text-xs text-red-500">{errors.valorAvance.message}</p>}
                {valorAvance > 0 && (
                  <p className={`text-xs font-medium ${excedeTope ? 'text-red-600' : 'text-gray-500'}`}>
                    {excedeTope
                      ? `Excede el disponible de ${formatCurrency(disponible)}`
                      : `Quedaría disponible: ${formatCurrency(quedaria)}`}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <Label>Solicitante</Label>
                <Input placeholder="Nombre del solicitante" {...register('solicitante')} />
                {errors.solicitante && <p className="text-xs text-red-500">{errors.solicitante.message}</p>}
              </div>

              <div className="space-y-1">
                <Label>Descripción</Label>
                <Input placeholder="Descripción del avance" {...register('descripcion')} />
                {errors.descripcion && <p className="text-xs text-red-500">{errors.descripcion.message}</p>}
              </div>

              {apiError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-md">{apiError}</p>
              )}

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={handleClose}>
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1" disabled={excedeTope} loading={isSubmitting || mutation.isPending}>
                  Guardar
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
