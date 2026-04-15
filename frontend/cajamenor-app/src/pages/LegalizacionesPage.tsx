import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuthStore } from '@/store/authStore'
import { getLegalizaciones, getResumenLegalizaciones, crearLegalizacion, iniciarReembolso } from '@/api/legalizaciones'
import { getAvancesPendientes } from '@/api/avances'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Select } from '@/components/ui/Select'
import { StatusCircle } from '@/components/ui/StatusCircle'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { LegalizacionDto } from '@/types'

const crearLegalizacionSchema = z.object({
  codigoLegalizacion: z.string().min(1, 'Requerido'),
  monto: z.string().min(1, 'Requerido').refine(v => !isNaN(Number(v)) && Number(v) > 0, 'Debe ser mayor a 0'),
  descripcion: z.string().min(1, 'Requerido'),
  tipoLegalizacion: z.string().min(1, 'Requerido'),
  fechaLegalizacion: z.string().min(1, 'Requerido'),
  avanceId: z.string().optional(),
})

type CrearLegalizacionForm = z.infer<typeof crearLegalizacionSchema>

function EstadoReembolsoBadge({ estado }: { estado: LegalizacionDto['estadoReembolso'] }) {
  const variants = {
    SinReembolso: 'warning',
    EnProceso: 'default',
    Reembolsado: 'success',
  } as const
  return <Badge variant={variants[estado]}>{estado}</Badge>
}

export function LegalizacionesPage() {
  const { user } = useAuthStore()
  const cajaId = user?.cajaId!
  const queryClient = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const isAdmin = user?.rol === 'Administrador'

  const { data: legalizaciones = [], isLoading } = useQuery({
    queryKey: ['legalizaciones', cajaId],
    queryFn: () => getLegalizaciones(cajaId),
  })

  const { data: resumen } = useQuery({
    queryKey: ['resumen-legalizaciones', cajaId],
    queryFn: () => getResumenLegalizaciones(cajaId),
  })

  const { data: avancesPendientes = [] } = useQuery({
    queryKey: ['avances-pendientes', cajaId],
    queryFn: () => getAvancesPendientes(cajaId),
    enabled: showModal,
  })

  const crearMutation = useMutation({
    mutationFn: (data: CrearLegalizacionForm) =>
      crearLegalizacion(cajaId, {
        ...data,
        cajaId,
        monto: Number(data.monto),
        avanceId: data.avanceId ? Number(data.avanceId) : null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['legalizaciones', cajaId] })
      queryClient.invalidateQueries({ queryKey: ['resumen-legalizaciones', cajaId] })
      queryClient.invalidateQueries({ queryKey: ['avances', cajaId] })
      queryClient.invalidateQueries({ queryKey: ['dashboard', cajaId] })
      setShowModal(false)
      reset()
    },
  })

  const reembolsarMutation = useMutation({
    mutationFn: (legalizacionId: number) => iniciarReembolso(cajaId, legalizacionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['legalizaciones', cajaId] })
      queryClient.invalidateQueries({ queryKey: ['reembolsos', cajaId] })
    },
  })

  const reembolsarTodasMutation = useMutation({
    mutationFn: () => {
      const pendientes = legalizaciones.filter(
        l => l.estadoReembolso === 'SinReembolso'
      )
      return Promise.all(pendientes.map(l => iniciarReembolso(cajaId, l.id)))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['legalizaciones', cajaId] })
      queryClient.invalidateQueries({ queryKey: ['reembolsos', cajaId] })
    },
  })

  const pendientesCount = legalizaciones.filter(
    l => l.estadoReembolso === 'SinReembolso'
  ).length

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CrearLegalizacionForm>({ resolver: zodResolver(crearLegalizacionSchema) })

  const onSubmit = (data: CrearLegalizacionForm) => crearMutation.mutate(data)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Legalizaciones</h2>
          <p className="text-sm text-gray-500 mt-0.5">Registro de legalizaciones de gastos</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setShowModal(true)}>+ Nueva legalización</Button>
        )}
      </div>

      {/* Resumen */}
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
              <p className="text-xs text-gray-500">Sin avance</p>
              <p className="text-2xl font-bold text-yellow-600">{resumen.sinAvance}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-gray-500">Con avance</p>
              <p className="text-2xl font-bold text-green-600">{resumen.conAvance}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabla */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Listado de legalizaciones</CardTitle>
            {isAdmin && (
              <Button
                size="sm"
                variant="secondary"
                disabled={pendientesCount === 0}
                loading={reembolsarTodasMutation.isPending}
                onClick={() => reembolsarTodasMutation.mutate()}
              >
                Reembolsar todas ({pendientesCount})
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-gray-500 py-8 text-center">Cargando...</p>
          ) : legalizaciones.length === 0 ? (
            <p className="text-sm text-gray-500 py-8 text-center">No hay legalizaciones registradas.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left">
                    {isAdmin && <th className="pb-3 pr-3 font-medium text-gray-500">Acción</th>}
                    <th className="pb-3 pr-3 font-medium text-gray-500">Código</th>
                    <th className="pb-3 pr-3 font-medium text-gray-500">Fecha</th>
                    <th className="pb-3 pr-3 font-medium text-gray-500">Avance</th>
                    <th className="pb-3 pr-3 font-medium text-gray-500">V. Avance</th>
                    <th className="pb-3 pr-3 font-medium text-gray-500">Monto</th>
                    <th className="pb-3 pr-3 font-medium text-gray-500">Diferencia</th>
                    <th className="pb-3 pr-3 font-medium text-gray-500">Desc. Caja</th>
                    <th className="pb-3 pr-3 font-medium text-gray-500">A Reembolsar</th>
                    <th className="pb-3 pr-3 font-medium text-gray-500">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {legalizaciones.map((leg) => (
                    <tr key={leg.id} className="hover:bg-gray-50">
                      {isAdmin && (
                        <td className="py-3 pr-3">
                          {leg.estadoReembolso === 'SinReembolso' ? (
                            <Button
                              size="sm"
                              loading={
                                reembolsarMutation.isPending &&
                                reembolsarMutation.variables === leg.id
                              }
                              onClick={() => reembolsarMutation.mutate(leg.id)}
                            >
                              Reembolsar
                            </Button>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-400 border border-gray-200">
                              Enviado
                            </span>
                          )}
                        </td>
                      )}
                      <td className="py-3 pr-3 font-mono font-medium text-teal-700">
                        {leg.codigoLegalizacion}
                      </td>
                      <td className="py-3 pr-3 text-gray-600">{formatDate(leg.fechaLegalizacion)}</td>
                      <td className="py-3 pr-3">
                        {leg.codigoAvance ? (
                          <span className="font-mono text-xs text-teal-700">{leg.codigoAvance}</span>
                        ) : (
                          <span className="text-gray-400 text-xs">Sin avance</span>
                        )}
                      </td>
                      <td className="py-3 pr-3">{formatCurrency(leg.valorAvance)}</td>
                      <td className="py-3 pr-3 font-medium">{formatCurrency(leg.monto)}</td>
                      <td className={`py-3 pr-3 font-medium ${leg.diferencia >= 0 ? 'text-orange-600' : 'text-green-600'}`}>
                        {formatCurrency(leg.diferencia)}
                      </td>
                      <td className="py-3 pr-3">{formatCurrency(leg.descuentoCaja)}</td>
                      <td className="py-3 pr-3 text-teal-700">{formatCurrency(leg.valorReembolsar)}</td>
                      <td className="py-3 pr-3">
                        <div className="flex items-center gap-1.5">
                          <StatusCircle estado={leg.estadoReembolso} size="sm" />
                          <EstadoReembolsoBadge estado={leg.estadoReembolso} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal nueva legalización */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold">Nueva Legalización</h3>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Código legalización</Label>
                  <Input placeholder="LEG-0001" {...register('codigoLegalizacion')} />
                  {errors.codigoLegalizacion && <p className="text-xs text-red-500">{errors.codigoLegalizacion.message}</p>}
                </div>
                <div className="space-y-1">
                  <Label>Fecha</Label>
                  <Input type="date" {...register('fechaLegalizacion')} />
                  {errors.fechaLegalizacion && <p className="text-xs text-red-500">{errors.fechaLegalizacion.message}</p>}
                </div>
              </div>

              <div className="space-y-1">
                <Label>Avance asociado (opcional)</Label>
                <Select {...register('avanceId')}>
                  <option value="">Sin avance</option>
                  {avancesPendientes.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.codigoAvance} — {formatCurrency(a.valorAvance)}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Monto legalizado</Label>
                <Input type="number" step="0.01" placeholder="0" {...register('monto')} />
                {errors.monto && <p className="text-xs text-red-500">{errors.monto.message}</p>}
              </div>

              <div className="space-y-1">
                <Label>Tipo de legalización</Label>
                <Select {...register('tipoLegalizacion')}>
                  <option value="">Seleccionar...</option>
                  <option value="Gastos de viaje">Gastos de viaje</option>
                  <option value="Materiales">Materiales</option>
                  <option value="Servicios">Servicios</option>
                  <option value="Alimentación">Alimentación</option>
                  <option value="Otro">Otro</option>
                </Select>
                {errors.tipoLegalizacion && <p className="text-xs text-red-500">{errors.tipoLegalizacion.message}</p>}
              </div>

              <div className="space-y-1">
                <Label>Descripción</Label>
                <Input placeholder="Descripción del gasto" {...register('descripcion')} />
                {errors.descripcion && <p className="text-xs text-red-500">{errors.descripcion.message}</p>}
              </div>

              {crearMutation.isError && (
                <p className="text-sm text-red-500">Error al crear la legalización.</p>
              )}

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => { setShowModal(false); reset() }}
                >
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1" loading={isSubmitting || crearMutation.isPending}>
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
