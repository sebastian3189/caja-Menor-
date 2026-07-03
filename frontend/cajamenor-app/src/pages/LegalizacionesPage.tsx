import React, { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuthStore } from '@/store/authStore'
import {
  getLegalizaciones, getResumenLegalizaciones, crearLegalizacion,
  iniciarReembolso, getSiguienteCodigoLegalizacion, subirRecibo, eliminarRecibo
} from '@/api/legalizaciones'
import { getAvancesPendientes } from '@/api/avances'
import { getDashboard } from '@/api/cajaMenor'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Select } from '@/components/ui/Select'
import { StatusCircle } from '@/components/ui/StatusCircle'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { LegalizacionDto, ReciboDto } from '@/types'

const crearLegalizacionSchema = z.object({
  codigoLegalizacion: z.string().min(1, 'Requerido'),
  monto: z.string().min(1, 'Requerido').refine(v => !isNaN(Number(v)) && Number(v) > 0, 'Debe ser mayor a 0'),
  descripcion: z.string().min(1, 'Requerido'),
  tipoLegalizacion: z.string().min(1, 'Requerido'),
  fechaLegalizacion: z.string().min(1, 'Requerido'),
  avanceId: z.string().optional(),
})

type CrearLegalizacionForm = z.infer<typeof crearLegalizacionSchema>

interface OcrErrorInfo {
  message: string
  valorOCR: number
  montoLegalizado: number
  diferencia: number
}

function EstadoReembolsoBadge({ estado }: { estado: LegalizacionDto['estadoReembolso'] }) {
  const variants = { SinReembolso: 'warning', EnProceso: 'default', Reembolsado: 'success' } as const
  return <Badge variant={variants[estado]}>{estado}</Badge>
}

function OcrBadge({ recibo }: { recibo: ReciboDto }) {
  if (recibo.validadoOCR) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded">
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        Verificado
      </span>
    )
  }
  if (recibo.notaOCR) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-50 border border-gray-200 px-1.5 py-0.5 rounded" title={recibo.notaOCR}>
        Sin verificar
      </span>
    )
  }
  return null
}

export function LegalizacionesPage() {
  const { user } = useAuthStore()
  const cajaId = user?.cajaId!
  const queryClient = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [uploadingId, setUploadingId] = useState<number | null>(null)
  const [ocrError, setOcrError] = useState<OcrErrorInfo | null>(null)
  const [apiError, setApiError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadTargetId = useRef<number | null>(null)
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

  const { data: dashboard } = useQuery({
    queryKey: ['dashboard', cajaId],
    queryFn: () => getDashboard(cajaId),
  })

  const { data: siguienteCodigo } = useQuery({
    queryKey: ['siguiente-codigo-legalizacion', cajaId],
    queryFn: () => getSiguienteCodigoLegalizacion(cajaId),
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
  } = useForm<CrearLegalizacionForm>({ resolver: zodResolver(crearLegalizacionSchema) })

  useEffect(() => {
    if (siguienteCodigo) setValue('codigoLegalizacion', siguienteCodigo.codigo)
  }, [siguienteCodigo, setValue])

  const avanceIdStr = watch('avanceId')
  const montoStr = watch('monto')
  const esSinAvance = !avanceIdStr
  const avanceSeleccionado = avanceIdStr
    ? avancesPendientes.find(a => a.id === Number(avanceIdStr))
    : undefined

  // Con avance: la descripción se hereda del avance y queda bloqueada. Sin avance: se captura a mano.
  useEffect(() => {
    if (avanceSeleccionado) {
      setValue('descripcion', avanceSeleccionado.descripcion)
    } else {
      setValue('descripcion', '')
    }
  }, [avanceSeleccionado, setValue])
  const monto = Number(montoStr) || 0
  const disponible = dashboard?.caja.disponible ?? 0
  const quedaria = disponible - monto
  const excedeTope = esSinAvance && monto > 0 && monto > disponible

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
      queryClient.invalidateQueries({ queryKey: ['siguiente-codigo-legalizacion', cajaId] })
      setShowModal(false)
      reset()
      setApiError(null)
    },
    onError: (error: any) => {
      setApiError(error?.response?.data?.message ?? 'Error al crear la legalización.')
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
      const pendientes = legalizaciones.filter(l => l.estadoReembolso === 'SinReembolso')
      return Promise.all(pendientes.map(l => iniciarReembolso(cajaId, l.id)))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['legalizaciones', cajaId] })
      queryClient.invalidateQueries({ queryKey: ['reembolsos', cajaId] })
    },
  })

  const eliminarReciboMutation = useMutation({
    mutationFn: ({ legId, reciboId }: { legId: number; reciboId: number }) =>
      eliminarRecibo(cajaId, legId, reciboId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['legalizaciones', cajaId] })
    },
  })

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !uploadTargetId.current) return
    const legId = uploadTargetId.current
    setUploadingId(legId)
    try {
      await subirRecibo(cajaId, legId, file)
      queryClient.invalidateQueries({ queryKey: ['legalizaciones', cajaId] })
    } catch (error: any) {
      if (error?.response?.status === 422) {
        setOcrError(error.response.data)
      } else {
        alert(error?.response?.data?.message ?? 'Error al subir el recibo.')
      }
    } finally {
      setUploadingId(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const triggerUpload = (legId: number) => {
    uploadTargetId.current = legId
    fileInputRef.current?.click()
  }

  const pendientesCount = legalizaciones.filter(l => l.estadoReembolso === 'SinReembolso').length

  const onSubmit = (data: CrearLegalizacionForm) => {
    if (excedeTope) return
    setApiError(null)
    crearMutation.mutate(data)
  }

  const handleClose = () => {
    setShowModal(false)
    reset()
    setApiError(null)
  }

  return (
    <div className="space-y-6">
      {/* Hidden file input for recibo upload */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept=".jpg,.jpeg,.png,.gif,.webp,.pdf"
        onChange={handleFileChange}
      />

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Legalizaciones</h2>
          <p className="text-sm text-gray-500 mt-0.5">Registro de legalizaciones de gastos</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setShowModal(true)}>+ Nueva legalización</Button>
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
                    <th className="pb-3 font-medium text-gray-500">Recibos</th>
                  </tr>
                </thead>
                <tbody>
                  {legalizaciones.map((leg) => (
                    <React.Fragment key={leg.id}>
                      <tr className="border-b border-gray-100 hover:bg-gray-50">
                        {isAdmin && (
                          <td className="py-3 pr-3">
                            {leg.estadoReembolso === 'SinReembolso' ? (
                              <Button
                                size="sm"
                                loading={reembolsarMutation.isPending && reembolsarMutation.variables === leg.id}
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
                        <td className="py-3 pr-3 font-mono font-medium text-teal-700">{leg.codigoLegalizacion}</td>
                        <td className="py-3 pr-3 text-gray-600">{formatDate(leg.fechaLegalizacion)}</td>
                        <td className="py-3 pr-3">
                          {leg.codigoAvance
                            ? <span className="font-mono text-xs text-teal-700">{leg.codigoAvance}</span>
                            : <span className="text-gray-400 text-xs">Sin avance</span>}
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
                        <td className="py-3">
                          <button
                            className="flex items-center gap-1 text-xs text-gray-500 hover:text-teal-700 transition-colors"
                            onClick={() => setExpandedId(expandedId === leg.id ? null : leg.id)}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                            </svg>
                            {leg.recibos?.length ?? 0}
                            {uploadingId === leg.id && (
                              <svg className="animate-spin h-3 w-3 text-teal-600 ml-1" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                              </svg>
                            )}
                          </button>
                        </td>
                      </tr>

                      {/* Expanded recibos panel */}
                      {expandedId === leg.id && (
                        <tr>
                          <td colSpan={isAdmin ? 11 : 10} className="pb-4 pt-0 px-4">
                            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                              <div className="flex items-center justify-between mb-3">
                                <p className="text-sm font-medium text-gray-700">Recibos adjuntos</p>
                                {isAdmin && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={uploadingId === leg.id}
                                    onClick={() => triggerUpload(leg.id)}
                                  >
                                    {uploadingId === leg.id ? 'Analizando factura...' : '+ Adjuntar recibo'}
                                  </Button>
                                )}
                              </div>
                              {!leg.recibos || leg.recibos.length === 0 ? (
                                <p className="text-xs text-gray-400 text-center py-2">Sin recibos adjuntos.</p>
                              ) : (
                                <div className="space-y-2">
                                  {leg.recibos.map((recibo) => (
                                    <div key={recibo.id} className="flex items-center justify-between bg-white rounded-md border border-gray-200 px-3 py-2">
                                      <div className="flex items-center gap-2 min-w-0">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        <a
                                          href={recibo.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-xs text-teal-700 hover:underline truncate max-w-[200px]"
                                        >
                                          {recibo.nombreOriginal}
                                        </a>
                                        <span className="text-xs text-gray-400">{formatDate(recibo.fechaSubida)}</span>
                                        <OcrBadge recibo={recibo} />
                                        {recibo.valorOCR != null && (
                                          <span className="text-xs text-gray-500">OCR: {formatCurrency(recibo.valorOCR)}</span>
                                        )}
                                      </div>
                                      {isAdmin && (
                                        <button
                                          className="text-gray-300 hover:text-red-500 transition-colors ml-2 flex-shrink-0"
                                          onClick={() => {
                                            if (confirm('¿Eliminar este recibo?')) {
                                              eliminarReciboMutation.mutate({ legId: leg.id, reciboId: recibo.id })
                                            }
                                          }}
                                        >
                                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                          </svg>
                                        </button>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
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
              <div className="flex items-start justify-between">
                <h3 className="text-lg font-semibold">Nueva Legalización</h3>
                {dashboard && esSinAvance && (
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Disponible en caja</p>
                    <p className="text-base font-semibold text-teal-700">{formatCurrency(dashboard.caja.disponible)}</p>
                  </div>
                )}
              </div>
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
                {esSinAvance && monto > 0 && (
                  <p className={`text-xs font-medium ${excedeTope ? 'text-red-600' : 'text-gray-500'}`}>
                    {excedeTope
                      ? `Excede el disponible de ${formatCurrency(disponible)}`
                      : `Quedaría disponible: ${formatCurrency(quedaria)}`}
                  </p>
                )}
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
                <Input
                  placeholder="Descripción del gasto"
                  readOnly={!!avanceSeleccionado}
                  className={avanceSeleccionado ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}
                  {...register('descripcion')}
                />
                {avanceSeleccionado && (
                  <p className="text-xs text-gray-500">Heredada del avance {avanceSeleccionado.codigoAvance}</p>
                )}
                {errors.descripcion && <p className="text-xs text-red-500">{errors.descripcion.message}</p>}
              </div>

              {apiError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-md">{apiError}</p>
              )}

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={handleClose}>
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1" disabled={excedeTope} loading={isSubmitting || crearMutation.isPending}>
                  Guardar
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal error OCR */}
      {ocrError && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <svg className="h-4 w-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-gray-900">Monto de factura no coincide</h3>
            </div>
            <div className="px-6 py-4 space-y-3">
              <p className="text-sm text-gray-700">{ocrError.message}</p>
              <div className="bg-gray-50 rounded-lg border border-gray-200 p-3 space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Valor detectado (OCR)</span>
                  <span className="font-medium text-red-600">{formatCurrency(ocrError.valorOCR)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Monto legalizado</span>
                  <span className="font-medium">{formatCurrency(ocrError.montoLegalizado)}</span>
                </div>
                <div className="flex justify-between border-t border-gray-200 pt-1.5">
                  <span className="text-gray-500">Diferencia</span>
                  <span className="font-medium text-red-600">{formatCurrency(ocrError.diferencia)}</span>
                </div>
              </div>
              <p className="text-xs text-gray-500">Verifique el monto registrado y la factura adjunta antes de volver a intentarlo.</p>
            </div>
            <div className="px-6 pb-4">
              <Button className="w-full" onClick={() => setOcrError(null)}>Entendido</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
