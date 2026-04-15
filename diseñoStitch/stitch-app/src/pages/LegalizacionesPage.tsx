import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { FileText, Plus, ArrowRight, AlertTriangle, Info, CheckCircle2, Filter, X, Paperclip, Trash2, Upload, ZoomIn, Pencil } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { getLegalizaciones, getResumenLegalizaciones, crearLegalizacion, editarLegalizacion, iniciarReembolso, subirRecibo, eliminarRecibo } from '@/api/legalizaciones'
import { getAvancesPendientes } from '@/api/avances'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Select } from '@/components/ui/Select'
import { StatCard } from '@/components/ui/StatCard'
import { StatusCircle } from '@/components/ui/StatusCircle'
import { Modal } from '@/components/ui/Modal'
import { PageHeader } from '@/components/ui/PageHeader'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { LegalizacionDto, ReciboDto, EditarLegalizacionDto } from '@/types'

const legalizacionSchema = z.object({
  codigoLegalizacion: z.string().min(1, 'Requerido'),
  monto: z.string().min(1, 'Requerido').refine(v => !isNaN(Number(v)) && Number(v) > 0, 'Debe ser mayor a 0'),
  descripcion: z.string().min(1, 'Requerido'),
  tipoLegalizacion: z.string().min(1, 'Requerido'),
  fechaLegalizacion: z.string().min(1, 'Requerido'),
  avanceId: z.string().optional(),
})

const editarLegalizacionSchema = z.object({
  codigoLegalizacion: z.string().min(1, 'Requerido'),
  monto: z.string().min(1, 'Requerido').refine(v => !isNaN(Number(v)) && Number(v) > 0, 'Debe ser mayor a 0'),
  descripcion: z.string().min(1, 'Requerido'),
  tipoLegalizacion: z.string().min(1, 'Requerido'),
  fechaLegalizacion: z.string().min(1, 'Requerido'),
})

type CrearLegalizacionForm = z.infer<typeof legalizacionSchema>
type EditarLegalizacionForm = z.infer<typeof editarLegalizacionSchema>

function EstadoBadge({ estado }: { estado: LegalizacionDto['estadoReembolso'] }) {
  const map = { SinReembolso: 'warning', EnProceso: 'info', Reembolsado: 'success' } as const
  const labels = { SinReembolso: 'Sin reembolso', EnProceso: 'En proceso', Reembolsado: 'Reembolsado' }
  return <Badge variant={map[estado]}>{labels[estado]}</Badge>
}

export function LegalizacionesPage() {
  const { user } = useAuthStore()
  const cajaId = user?.cajaId!
  const queryClient = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editingLeg, setEditingLeg] = useState<LegalizacionDto | null>(null)
  const [reciboLeg, setReciboLeg] = useState<LegalizacionDto | null>(null)
  const [vistaPrevia, setVistaPrevia] = useState<string | null>(null)
  const isAdmin = user?.rol === 'Administrador'

  const [filtroEstado, setFiltroEstado] = useState('')
  const [filtroFechaDesde, setFiltroFechaDesde] = useState('')
  const [filtroFechaHasta, setFiltroFechaHasta] = useState('')

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
      queryClient.invalidateQueries({ queryKey: ['avances-pendientes', cajaId] })
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
      queryClient.invalidateQueries({ queryKey: ['dashboard', cajaId] })
      queryClient.invalidateQueries({ queryKey: ['arqueo', cajaId] })
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
      queryClient.invalidateQueries({ queryKey: ['dashboard', cajaId] })
      queryClient.invalidateQueries({ queryKey: ['arqueo', cajaId] })
    },
  })

  const subirReciboMutation = useMutation({
    mutationFn: ({ legId, archivo }: { legId: number; archivo: File }) =>
      subirRecibo(cajaId, legId, archivo),
    onSuccess: (recibo, { legId }) => {
      queryClient.setQueryData<LegalizacionDto[]>(['legalizaciones', cajaId], prev =>
        prev?.map(l => l.id === legId ? { ...l, recibos: [...l.recibos, recibo] } : l) ?? []
      )
      setReciboLeg(prev => prev?.id === legId ? { ...prev, recibos: [...prev.recibos, recibo] } : prev)
    },
  })

  const eliminarReciboMutation = useMutation({
    mutationFn: ({ legId, reciboId }: { legId: number; reciboId: number }) =>
      eliminarRecibo(cajaId, legId, reciboId),
    onSuccess: (_, { legId, reciboId }) => {
      queryClient.setQueryData<LegalizacionDto[]>(['legalizaciones', cajaId], prev =>
        prev?.map(l => l.id === legId ? { ...l, recibos: l.recibos.filter(r => r.id !== reciboId) } : l) ?? []
      )
      setReciboLeg(prev => prev?.id === legId ? { ...prev, recibos: prev.recibos.filter(r => r.id !== reciboId) } : prev)
    },
  })

  const legalizacionesFiltradas = legalizaciones.filter(l => {
    if (filtroEstado && l.estadoReembolso !== filtroEstado) return false
    if (filtroFechaDesde && new Date(l.fechaLegalizacion) < new Date(filtroFechaDesde)) return false
    if (filtroFechaHasta && new Date(l.fechaLegalizacion) > new Date(filtroFechaHasta + 'T23:59:59')) return false
    return true
  })
  const hayFiltros = filtroEstado || filtroFechaDesde || filtroFechaHasta
  const pendientesCount = legalizaciones.filter(l => l.estadoReembolso === 'SinReembolso').length

  const editarMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: EditarLegalizacionForm }) => {
      const dto: EditarLegalizacionDto = { ...data, monto: Number(data.monto) }
      return editarLegalizacion(cajaId, id, dto)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['legalizaciones', cajaId] })
      queryClient.invalidateQueries({ queryKey: ['dashboard', cajaId] })
      queryClient.invalidateQueries({ queryKey: ['arqueo', cajaId] })
      setEditingLeg(null)
      resetEdit()
    },
  })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CrearLegalizacionForm>({ resolver: zodResolver(legalizacionSchema) })

  const {
    register: registerEdit,
    handleSubmit: handleSubmitEdit,
    reset: resetEdit,
    formState: { errors: errorsEdit, isSubmitting: isSubmittingEdit },
  } = useForm<EditarLegalizacionForm>({ resolver: zodResolver(editarLegalizacionSchema) })

  const abrirEditar = (leg: LegalizacionDto) => {
    setEditingLeg(leg)
    resetEdit({
      codigoLegalizacion: leg.codigoLegalizacion,
      fechaLegalizacion: leg.fechaLegalizacion.split('T')[0],
      monto: String(leg.monto),
      descripcion: leg.descripcion,
      tipoLegalizacion: leg.tipoLegalizacion,
    })
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Legalizaciones"
        subtitle="Registro de legalizaciones de gastos"
        icon={FileText}
        iconColor="text-emerald-600"
        iconBg="bg-emerald-100"
        actions={
          isAdmin ? (
            <Button onClick={() => setShowModal(true)}>
              <Plus size={15} /> Nueva legalización
            </Button>
          ) : undefined
        }
      />

      {/* Stats */}
      {resumen && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard label="Total" value={resumen.total} icon={FileText} iconColor="text-slate-600" iconBg="bg-slate-100" />
          <StatCard label="Sin avance" value={resumen.sinAvance} icon={FileText} iconColor="text-amber-600" iconBg="bg-amber-100" />
          <StatCard label="Con avance" value={resumen.conAvance} icon={FileText} iconColor="text-emerald-600" iconBg="bg-emerald-100" />
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3 px-4 py-3 bg-slate-50 rounded-xl border border-slate-200">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 shrink-0">
          <Filter size={13} />
          Filtros
        </div>
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-400">Estado:</span>
            <div className="flex gap-1">
              {[
                { value: '', label: 'Todos' },
                { value: 'SinReembolso', label: 'Sin reembolso' },
                { value: 'EnProceso', label: 'En proceso' },
                { value: 'Reembolsado', label: 'Reembolsado' },
              ].map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setFiltroEstado(value)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                    filtroEstado === value
                      ? 'bg-emerald-500 text-white'
                      : 'bg-white text-slate-500 border border-slate-200 hover:border-emerald-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-400">Desde:</span>
            <input
              type="date"
              value={filtroFechaDesde}
              onChange={e => setFiltroFechaDesde(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white text-slate-700 focus:outline-none focus:border-emerald-400"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-400">Hasta:</span>
            <input
              type="date"
              value={filtroFechaHasta}
              onChange={e => setFiltroFechaHasta(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white text-slate-700 focus:outline-none focus:border-emerald-400"
            />
          </div>
          {hayFiltros && (
            <button
              onClick={() => { setFiltroEstado(''); setFiltroFechaDesde(''); setFiltroFechaHasta('') }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-red-500 border border-red-200 bg-red-50 hover:bg-red-100 transition-all"
            >
              <X size={11} /> Limpiar
            </button>
          )}
        </div>
        {hayFiltros && (
          <span className="text-xs text-slate-400 shrink-0">{legalizacionesFiltradas.length} resultado{legalizacionesFiltradas.length !== 1 ? 's' : ''}</span>
        )}
      </div>

      {/* Table */}
      <Card accent="emerald">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-3 justify-between">
            <CardTitle>Listado de legalizaciones</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400">
                <Info size={12} />
                <span>Círculo indica estado de reembolso</span>
              </div>
              {isAdmin && (
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={pendientesCount === 0}
                  loading={reembolsarTodasMutation.isPending}
                  onClick={() => reembolsarTodasMutation.mutate()}
                >
                  <ArrowRight size={13} />
                  Reembolsar todas ({pendientesCount})
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-16 flex items-center justify-center gap-3 text-slate-400">
              <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">Cargando legalizaciones...</span>
            </div>
          ) : legalizaciones.length === 0 ? (
            <div className="py-16 text-center">
              <FileText size={32} className="text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-400">No hay legalizaciones registradas</p>
              {isAdmin && (
                <Button variant="secondary" size="sm" className="mt-3" onClick={() => setShowModal(true)}>
                  Registrar primera legalización
                </Button>
              )}
            </div>
          ) : legalizacionesFiltradas.length === 0 ? (
            <div className="py-12 text-center">
              <Filter size={28} className="text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-400">Ninguna legalización coincide con los filtros aplicados</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="stitch-table">
                <thead>
                  <tr>
                    {isAdmin && <th></th>}
                    {isAdmin && <th>Acción</th>}
                    <th>Código</th>
                    <th>Fecha</th>
                    <th>Avance</th>
                    <th>V. Avance</th>
                    <th>Monto</th>
                    <th>Diferencia</th>
                    <th>Desc. Caja</th>
                    <th>A Reembolsar</th>
                    <th>Estado</th>
                    <th>Recibos</th>
                  </tr>
                </thead>
                <tbody>
                  {legalizacionesFiltradas.map((leg) => (
                    <tr key={leg.id}>
                      {isAdmin && (
                        <td>
                          {leg.estadoReembolso === 'SinReembolso' && (
                            <button
                              onClick={() => abrirEditar(leg)}
                              className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                              title="Editar legalización"
                            >
                              <Pencil size={13} />
                            </button>
                          )}
                        </td>
                      )}
                      {isAdmin && (
                        <td>
                          {leg.estadoReembolso === 'SinReembolso' ? (
                            <Button
                              size="sm"
                              variant="secondary"
                              loading={
                                reembolsarMutation.isPending &&
                                reembolsarMutation.variables === leg.id
                              }
                              onClick={() => reembolsarMutation.mutate(leg.id)}
                            >
                              <ArrowRight size={13} />
                              Reembolsar
                            </Button>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-600 border border-emerald-200">
                              <CheckCircle2 size={11} />
                              Enviado
                            </span>
                          )}
                        </td>
                      )}
                      <td>
                        <span className="font-mono text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                          {leg.codigoLegalizacion}
                        </span>
                      </td>
                      <td className="text-xs text-slate-500">{formatDate(leg.fechaLegalizacion)}</td>
                      <td>
                        {leg.codigoAvance ? (
                          <span className="font-mono text-xs text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                            {leg.codigoAvance}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Sin avance</span>
                        )}
                      </td>
                      <td className="text-sm">{formatCurrency(leg.valorAvance)}</td>
                      <td className="font-semibold text-slate-900">{formatCurrency(leg.monto)}</td>
                      <td className={`font-medium text-sm ${leg.diferencia >= 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {formatCurrency(leg.diferencia)}
                      </td>
                      <td className="text-sm text-slate-600">{formatCurrency(leg.descuentoCaja)}</td>
                      <td className="font-semibold text-indigo-700">{formatCurrency(leg.valorReembolsar)}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <StatusCircle estado={leg.estadoReembolso} pulse={leg.estadoReembolso !== 'Reembolsado'} />
                          <EstadoBadge estado={leg.estadoReembolso} />
                        </div>
                      </td>
                      <td>
                        {leg.estadoReembolso === 'SinReembolso' ? (
                          <button
                            onClick={() => setReciboLeg(leg)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all border ${
                              leg.recibos.length > 0
                                ? 'bg-indigo-50 text-indigo-600 border-indigo-200 hover:bg-indigo-100'
                                : 'bg-slate-50 text-slate-400 border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <Paperclip size={11} />
                            {leg.recibos.length > 0 ? leg.recibos.length : 'Subir'}
                          </button>
                        ) : (
                          <span className="text-xs text-slate-300">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal recibos */}
      <Modal
        open={!!reciboLeg}
        onClose={() => setReciboLeg(null)}
        title={`Recibos — ${reciboLeg?.codigoLegalizacion ?? ''}`}
        size="lg"
      >
        {reciboLeg && (
          <div className="space-y-4">
            {/* Upload button: solo admin y solo si la legalización aún no ha pasado a proceso */}
            {isAdmin && reciboLeg.estadoReembolso === 'SinReembolso' && (
              <div>
                <label className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border-2 border-dashed border-indigo-200 bg-indigo-50 text-indigo-600 text-sm font-medium cursor-pointer hover:bg-indigo-100 transition-all">
                  {subirReciboMutation.isPending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                      Subiendo...
                    </>
                  ) : (
                    <>
                      <Upload size={15} />
                      Subir recibo (JPG, PNG, PDF)
                    </>
                  )}
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.gif,.webp,.pdf"
                    className="hidden"
                    disabled={subirReciboMutation.isPending}
                    onChange={e => {
                      const f = e.target.files?.[0]
                      if (f) subirReciboMutation.mutate({ legId: reciboLeg.id, archivo: f })
                      e.target.value = ''
                    }}
                  />
                </label>
              </div>
            )}

            {/* Gallery */}
            {reciboLeg.recibos.length === 0 ? (
              <div className="py-10 text-center">
                <Paperclip size={28} className="text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-400">No hay recibos adjuntos aún</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {reciboLeg.recibos.map((r: ReciboDto) => {
                  const esPdf = r.url.toLowerCase().endsWith('.pdf')
                  return (
                    <div key={r.id} className="relative group rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                      {esPdf ? (
                        <a
                          href={r.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex flex-col items-center justify-center h-32 gap-2 text-slate-500 hover:text-indigo-600 transition-colors"
                        >
                          <FileText size={32} className="text-red-400" />
                          <span className="text-xs text-center px-2 truncate w-full text-center">{r.nombreOriginal}</span>
                        </a>
                      ) : (
                        <button
                          onClick={() => setVistaPrevia(r.url)}
                          className="w-full h-32 block"
                        >
                          <img
                            src={r.url}
                            alt={r.nombreOriginal}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
                            <ZoomIn size={20} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </button>
                      )}
                      {isAdmin && reciboLeg.estadoReembolso === 'SinReembolso' && (
                        <button
                          onClick={() => eliminarReciboMutation.mutate({ legId: reciboLeg.id, reciboId: r.id })}
                          disabled={eliminarReciboMutation.isPending}
                          className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                        >
                          <Trash2 size={11} />
                        </button>
                      )}
                      <p className="text-xs text-slate-400 px-2 py-1 truncate">{r.nombreOriginal}</p>
                    </div>
                  )
                })}
              </div>
            )}

            <div className="flex justify-end pt-1">
              <Button variant="outline" size="sm" onClick={() => setReciboLeg(null)}>Cerrar</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Vista previa imagen */}
      {vistaPrevia && (
        <div
          className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4"
          onClick={() => setVistaPrevia(null)}
        >
          <div className="relative max-w-4xl max-h-full">
            <img src={vistaPrevia} alt="Vista previa" className="max-w-full max-h-[85vh] rounded-xl object-contain" />
            <button
              onClick={() => setVistaPrevia(null)}
              className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-white text-slate-700 flex items-center justify-center shadow-lg hover:bg-slate-100"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Modal editar legalización */}
      <Modal
        open={!!editingLeg}
        onClose={() => { setEditingLeg(null); resetEdit() }}
        title={`Editar — ${editingLeg?.codigoLegalizacion ?? ''}`}
        size="lg"
      >
        {editingLeg && (
          <form onSubmit={handleSubmitEdit((d) => editarMutation.mutate({ id: editingLeg.id, data: d }))} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Código legalización</Label>
                <Input placeholder="LEG-0001" {...registerEdit('codigoLegalizacion')} error={!!errorsEdit.codigoLegalizacion} />
                {errorsEdit.codigoLegalizacion && <p className="text-xs text-red-500">{errorsEdit.codigoLegalizacion.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Fecha</Label>
                <Input type="date" {...registerEdit('fechaLegalizacion')} error={!!errorsEdit.fechaLegalizacion} />
                {errorsEdit.fechaLegalizacion && <p className="text-xs text-red-500">{errorsEdit.fechaLegalizacion.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Monto legalizado</Label>
                <Input type="number" step="0.01" placeholder="0" {...registerEdit('monto')} error={!!errorsEdit.monto} />
                {errorsEdit.monto && <p className="text-xs text-red-500">{errorsEdit.monto.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Tipo de gasto</Label>
                <Select {...registerEdit('tipoLegalizacion')}>
                  <option value="">Seleccionar...</option>
                  <option value="Gastos de viaje">Gastos de viaje</option>
                  <option value="Materiales">Materiales</option>
                  <option value="Servicios">Servicios</option>
                  <option value="Alimentación">Alimentación</option>
                  <option value="Otro">Otro</option>
                </Select>
                {errorsEdit.tipoLegalizacion && <p className="text-xs text-red-500">{errorsEdit.tipoLegalizacion.message}</p>}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Descripción</Label>
              <Input placeholder="Descripción del gasto" {...registerEdit('descripcion')} error={!!errorsEdit.descripcion} />
              {errorsEdit.descripcion && <p className="text-xs text-red-500">{errorsEdit.descripcion.message}</p>}
            </div>

            {editingLeg.codigoAvance && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-50 border border-indigo-100 text-xs text-indigo-600">
                <span className="font-mono font-semibold">{editingLeg.codigoAvance}</span>
                <span className="text-indigo-400">— avance ligado (no editable)</span>
              </div>
            )}

            {editarMutation.isError && (
              <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {(editarMutation.error as any)?.response?.data?.message ?? 'Error al guardar los cambios.'}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => { setEditingLeg(null); resetEdit() }}>
                Cancelar
              </Button>
              <Button type="submit" className="flex-1" loading={isSubmittingEdit || editarMutation.isPending}>
                Guardar cambios
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal nueva legalización */}
      <Modal
        open={showModal}
        onClose={() => { setShowModal(false); reset() }}
        title="Nueva Legalización"
        size="lg"
      >
        <form onSubmit={handleSubmit((d) => crearMutation.mutate(d))} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Código legalización</Label>
              <Input placeholder="LEG-0001" {...register('codigoLegalizacion')} error={!!errors.codigoLegalizacion} />
              {errors.codigoLegalizacion && <p className="text-xs text-red-500">{errors.codigoLegalizacion.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Fecha</Label>
              <Input type="date" {...register('fechaLegalizacion')} error={!!errors.fechaLegalizacion} />
              {errors.fechaLegalizacion && <p className="text-xs text-red-500">{errors.fechaLegalizacion.message}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Avance asociado</Label>
            <Select {...register('avanceId')}>
              <option value="">Sin avance (gasto directo)</option>
              {avancesPendientes.map(a => (
                <option key={a.id} value={a.id}>
                  {a.codigoAvance} — {formatCurrency(a.valorAvance)} — {a.solicitante}
                </option>
              ))}
            </Select>
            {avancesPendientes.length === 0 && (
              <p className="text-xs text-slate-400 flex items-center gap-1">
                <AlertTriangle size={11} /> No hay avances pendientes disponibles
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Monto legalizado</Label>
              <Input type="number" step="0.01" placeholder="0" {...register('monto')} error={!!errors.monto} />
              {errors.monto && <p className="text-xs text-red-500">{errors.monto.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Tipo de gasto</Label>
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
          </div>

          <div className="space-y-1.5">
            <Label>Descripción</Label>
            <Input placeholder="Descripción del gasto" {...register('descripcion')} error={!!errors.descripcion} />
            {errors.descripcion && <p className="text-xs text-red-500">{errors.descripcion.message}</p>}
          </div>

          {crearMutation.isError && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              Error al crear la legalización. Verifique los datos.
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => { setShowModal(false); reset() }}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" loading={isSubmitting || crearMutation.isPending}>
              Guardar legalización
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
