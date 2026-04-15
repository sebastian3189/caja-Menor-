import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuthStore } from '@/store/authStore'
import { getAvances, getResumenAvances, crearAvance } from '@/api/avances'
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
  return (
    <Badge variant={estado === 'Pendiente' ? 'warning' : 'success'}>
      {estado}
    </Badge>
  )
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
  const isAdmin = user?.rol === 'Administrador'

  const { data: avances = [], isLoading } = useQuery({
    queryKey: ['avances', cajaId],
    queryFn: () => getAvances(cajaId),
  })

  const { data: resumen } = useQuery({
    queryKey: ['resumen-avances', cajaId],
    queryFn: () => getResumenAvances(cajaId),
  })

  const mutation = useMutation({
    mutationFn: (data: CrearAvanceForm) =>
      crearAvance(cajaId, { ...data, valorAvance: Number(data.valorAvance), cajaId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['avances', cajaId] })
      queryClient.invalidateQueries({ queryKey: ['resumen-avances', cajaId] })
      queryClient.invalidateQueries({ queryKey: ['dashboard', cajaId] })
      setShowModal(false)
      reset()
    },
  })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CrearAvanceForm>({ resolver: zodResolver(crearAvanceSchema) })

  const onSubmit = (data: CrearAvanceForm) => mutation.mutate(data)

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

      {/* Tabla */}
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
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {avances.map((avance) => (
                    <tr key={avance.id} className="hover:bg-gray-50">
                      <td className="py-3 pr-4 font-mono font-medium text-teal-700">
                        {avance.codigoAvance}
                      </td>
                      <td className="py-3 pr-4 text-gray-600">{formatDate(avance.fechaEnvio)}</td>
                      <td className="py-3 pr-4 text-gray-700">{avance.solicitante}</td>
                      <td className="py-3 pr-4 font-medium">{formatCurrency(avance.valorAvance)}</td>
                      <td className="py-3 pr-4">
                        <EstadoAvanceBadge estado={avance.estado} />
                      </td>
                      <td className="py-3 pr-4">
                        <TipoAvanceBadge tipo={avance.tipoAvance} />
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <StatusCircle estado={avance.estadoReembolso} size="sm" />
                          <span className="text-xs text-gray-500">{avance.estadoReembolso}</span>
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

      {/* Modal crear avance */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold">Nuevo Avance</h3>
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

              {mutation.isError && (
                <p className="text-sm text-red-500">Error al crear el avance.</p>
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
                <Button type="submit" className="flex-1" loading={isSubmitting || mutation.isPending}>
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
