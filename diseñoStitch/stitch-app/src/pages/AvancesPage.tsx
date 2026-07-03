import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Wallet, Plus, Hash, DollarSign, Calendar, FileText, Filter, X, Pencil, Trash2, Download, Search } from 'lucide-react'
import { Pagination } from '@/components/ui/Pagination'
import { StackedBar } from '@/components/ui/StackedBar'
import { useAuthStore } from '@/store/authStore'
import { getAvances, getResumenAvances, crearAvance, editarAvance, getSiguienteCodigoAvance, eliminarAvance, exportarAvances, descargarPdfAvance } from '@/api/avances'
import { getSolicitantesDeCaja } from '@/api/solicitudes'
import { getDashboard } from '@/api/cajaMenor'
import { descargarBlob, nombreConFecha } from '@/lib/download'
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
import type { AvanceDto, EditarAvanceDto } from '@/types'

const avanceSchema = z.object({
  codigoAvance: z.string().min(1, 'Requerido'),
  fechaEnvio: z.string().min(1, 'Requerido'),
  valorAvance: z.string().min(1, 'Requerido').refine(v => !isNaN(Number(v)) && Number(v) > 0, 'Debe ser mayor a 0'),
  descripcion: z.string().min(1, 'Requerido'),
  solicitante: z.string().min(1, 'Requerido'),
})

type AvanceForm = z.infer<typeof avanceSchema>

function EstadoBadge({ estado }: { estado: AvanceDto['estado'] }) {
  return (
    <Badge variant={estado === 'Pendiente' ? 'warning' : 'success'}>
      {estado}
    </Badge>
  )
}

function TipoBadge({ tipo }: { tipo: AvanceDto['tipoAvance'] }) {
  if (!tipo) return <span className="text-slate-300 text-xs">—</span>
  const map = { Total: 'secondary', Sobrante: 'warning', Faltante: 'destructive' } as const
  return <Badge variant={map[tipo]}>{tipo}</Badge>
}

const estadoReembolsoLabel: Record<AvanceDto['estadoReembolso'], string> = {
  SinReembolso: 'Sin reembolso',
  EnProceso: 'En proceso',
  Reembolsado: 'Reembolsado',
}

export function AvancesPage() {
  const { user } = useAuthStore()
  const cajaId = user?.cajaId!
  const queryClient = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editingAvance, setEditingAvance] = useState<AvanceDto | null>(null)
  const isAdmin = user?.rol === 'Administrador'

  const [filtroEstado, setFiltroEstado] = useState('')
  const [filtroFechaDesde, setFiltroFechaDesde] = useState('')
  const [filtroFechaHasta, setFiltroFechaHasta] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [crearError, setCrearError] = useState<string | null>(null)
  const [exportando, setExportando] = useState(false)
  const [pdfCargandoId, setPdfCargandoId] = useState<number | null>(null)

  const handleExportar = async () => {
    setExportando(true)
    try {
      const blob = await exportarAvances(cajaId)
      descargarBlob(blob, nombreConFecha('Avances', 'xlsx'))
    } finally {
      setExportando(false)
    }
  }

  const descargarPdf = async (avance: AvanceDto) => {
    setPdfCargandoId(avance.id)
    try {
      const blob = await descargarPdfAvance(cajaId, avance.id)
      descargarBlob(blob, `Avance_${avance.codigoAvance}.pdf`)
    } finally {
      setPdfCargandoId(null)
    }
  }

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

  const { data: solicitantes = [] } = useQuery({
    queryKey: ['solicitantes-caja', cajaId],
    queryFn: () => getSolicitantesDeCaja(cajaId),
    enabled: (showModal || !!editingAvance) && isAdmin,
  })

  const { data: siguienteCodigo } = useQuery({
    queryKey: ['siguiente-codigo-avance', cajaId],
    queryFn: () => getSiguienteCodigoAvance(cajaId),
    enabled: showModal && isAdmin,
    refetchOnMount: 'always',
  })

  const crearMutation = useMutation({
    mutationFn: (data: AvanceForm) =>
      crearAvance(cajaId, { ...data, valorAvance: Number(data.valorAvance), cajaId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['avances', cajaId] })
      queryClient.invalidateQueries({ queryKey: ['resumen-avances', cajaId] })
      queryClient.invalidateQueries({ queryKey: ['dashboard', cajaId] })
      queryClient.invalidateQueries({ queryKey: ['siguiente-codigo-avance', cajaId] })
      setShowModal(false)
      reset()
      setCrearError(null)
    },
    onError: (error: any) => {
      setCrearError(error?.response?.data?.message ?? 'Error al crear el avance.')
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

  const editarMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: AvanceForm }) => {
      const dto: EditarAvanceDto = { ...data, valorAvance: Number(data.valorAvance) }
      return editarAvance(cajaId, id, dto)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['avances', cajaId] })
      queryClient.invalidateQueries({ queryKey: ['resumen-avances', cajaId] })
      queryClient.invalidateQueries({ queryKey: ['dashboard', cajaId] })
      setEditingAvance(null)
      resetEdit()
    },
  })

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<AvanceForm>({ resolver: zodResolver(avanceSchema) })

  useEffect(() => {
    if (siguienteCodigo) setValue('codigoAvance', siguienteCodigo.codigo)
  }, [siguienteCodigo, setValue])

  useEffect(() => {
    setPage(1)
  }, [busqueda, filtroEstado, filtroFechaDesde, filtroFechaHasta, pageSize])

  const valorAvanceStr = watch('valorAvance')
  const valorAvance = Number(valorAvanceStr) || 0
  const disponible = dashboard?.caja.disponible ?? 0
  const quedaria = disponible - valorAvance
  const excedeTope = valorAvance > 0 && valorAvance > disponible

  const {
    register: registerEdit,
    handleSubmit: handleSubmitEdit,
    reset: resetEdit,
    formState: { errors: errorsEdit, isSubmitting: isSubmittingEdit },
  } = useForm<AvanceForm>({ resolver: zodResolver(avanceSchema) })

  const abrirEditar = (avance: AvanceDto) => {
    setEditingAvance(avance)
    resetEdit({
      codigoAvance: avance.codigoAvance,
      fechaEnvio: avance.fechaEnvio.split('T')[0],
      valorAvance: String(avance.valorAvance),
      descripcion: avance.descripcion,
      solicitante: avance.solicitante,
    })
  }

  const avancesFiltrados = avances.filter(a => {
    if (filtroEstado && a.estado !== filtroEstado) return false
    if (filtroFechaDesde && new Date(a.fechaEnvio) < new Date(filtroFechaDesde)) return false
    if (filtroFechaHasta && new Date(a.fechaEnvio) > new Date(filtroFechaHasta + 'T23:59:59')) return false
    if (busqueda) {
      const q = busqueda.toLowerCase()
      const match = a.codigoAvance.toLowerCase().includes(q)
        || a.descripcion.toLowerCase().includes(q)
        || a.solicitante.toLowerCase().includes(q)
      if (!match) return false
    }
    return true
  })
  const hayFiltros = filtroEstado || filtroFechaDesde || filtroFechaHasta || busqueda

  // Paginación cliente
  const totalPaginas = Math.max(1, Math.ceil(avancesFiltrados.length / pageSize))
  const paginaActual = Math.min(page, totalPaginas)
  const avancesPagina = avancesFiltrados.slice((paginaActual - 1) * pageSize, paginaActual * pageSize)

  const pct = resumen && resumen.total > 0 ? resumen.porcentajeLegalizados : 0

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Avances"
        subtitle="Gestión de avances de caja menor"
        icon={Wallet}
        iconColor="text-amber-600"
        iconBg="bg-amber-100"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleExportar} loading={exportando} disabled={avances.length === 0}>
              <Download size={15} /> Exportar
            </Button>
            {isAdmin && (
              <Button onClick={() => setShowModal(true)}>
                <Plus size={15} /> Nuevo avance
              </Button>
            )}
          </div>
        }
      />

      {/* Stats */}
      {resumen && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            label="Total registrados"
            value={resumen.total}
            icon={Wallet}
            iconColor="text-slate-600"
            iconBg="bg-slate-100"
          />
          <StatCard
            label="Pendientes"
            value={resumen.pendientes}
            icon={Wallet}
            iconColor="text-amber-600"
            iconBg="bg-amber-100"
          />
          <StatCard
            label="Legalizados"
            value={resumen.legalizados}
            icon={Wallet}
            iconColor="text-emerald-600"
            iconBg="bg-emerald-100"
          />
        </div>
      )}

      {/* Progreso de legalización — barra apilada como en Dashboard */}
      {resumen && resumen.total > 0 && (
        <Card accent="amber">
          <CardContent className="py-4">
            <div className="flex items-center justify-between mb-2.5">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Progreso de legalización
              </p>
              <span className="text-sm font-bold" style={{ color: '#0d9488' }}>{pct.toFixed(0)}%</span>
            </div>
            <StackedBar
              height={24}
              formatValue={(v) => `${v}`}
              segments={[
                { label: 'Legalizados', value: resumen.legalizados, color: '#0d9488' },
                { label: 'Pendientes', value: resumen.pendientes, color: '#d97706' },
              ]}
            />
          </CardContent>
        </Card>
      )}

      {/* Búsqueda */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar por código, descripción o solicitante..."
          className="w-full pl-9 pr-9 py-2.5 text-sm border border-slate-200 rounded-xl bg-white text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
        />
        {busqueda && (
          <button
            onClick={() => setBusqueda('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            aria-label="Limpiar búsqueda"
          >
            <X size={15} />
          </button>
        )}
      </div>

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
              {['', 'Pendiente', 'Legalizado'].map(e => (
                <button
                  key={e}
                  onClick={() => setFiltroEstado(e)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                    filtroEstado === e
                      ? 'bg-amber-500 text-white'
                      : 'bg-white text-slate-500 border border-slate-200 hover:border-amber-300'
                  }`}
                >
                  {e === '' ? 'Todos' : e}
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
              className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white text-slate-700 focus:outline-none focus:border-amber-400"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-400">Hasta:</span>
            <input
              type="date"
              value={filtroFechaHasta}
              onChange={e => setFiltroFechaHasta(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white text-slate-700 focus:outline-none focus:border-amber-400"
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
          <span className="text-xs text-slate-400 shrink-0">{avancesFiltrados.length} resultado{avancesFiltrados.length !== 1 ? 's' : ''}</span>
        )}
      </div>

      {/* Table */}
      <Card accent="amber">
        <CardHeader>
          <CardTitle>Listado de avances</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-16 flex items-center justify-center gap-3 text-slate-400">
              <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">Cargando avances...</span>
            </div>
          ) : avances.length === 0 ? (
            <div className="py-16 text-center">
              <Wallet size={32} className="text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-400">No hay avances registrados</p>
              {isAdmin && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="mt-3"
                  onClick={() => setShowModal(true)}
                >
                  Registrar primer avance
                </Button>
              )}
            </div>
          ) : avancesFiltrados.length === 0 ? (
            <div className="py-12 text-center">
              <Filter size={28} className="text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-400">Ningún avance coincide con los filtros aplicados</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="stitch-table">
                <thead>
                  <tr>
                    {isAdmin && <th></th>}
                    <th>Código</th>
                    <th>Fecha</th>
                    <th>Solicitante</th>
                    <th>Descripción</th>
                    <th>Valor</th>
                    <th>Estado</th>
                    <th>Tipo</th>
                    <th>Reembolso</th>
                  </tr>
                </thead>
                <tbody>
                  {avancesPagina.map((avance) => (
                    <tr key={avance.id}>
                      {isAdmin && (
                        <td>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => avance.estado === 'Pendiente' && abrirEditar(avance)}
                              disabled={avance.estado === 'Legalizado'}
                              className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 disabled:hover:text-slate-400 disabled:hover:bg-transparent"
                              title={avance.estado === 'Legalizado' ? 'No editable: avance ya legalizado' : 'Editar avance'}
                            >
                              <Pencil size={13} />
                            </button>
                            {avance.estado === 'Pendiente' && (
                              <button
                                onClick={() => {
                                  if (confirm(`¿Eliminar ${avance.codigoAvance}? Se devolverá el monto a la caja.`))
                                    eliminarMutation.mutate(avance.id)
                                }}
                                disabled={eliminarMutation.isPending && eliminarMutation.variables === avance.id}
                                className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors text-slate-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-40"
                                title="Eliminar avance pendiente"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                            <button
                              onClick={() => descargarPdf(avance)}
                              disabled={pdfCargandoId === avance.id}
                              className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors text-slate-400 hover:text-teal-600 hover:bg-teal-50 disabled:opacity-40"
                              title="Descargar PDF del avance"
                            >
                              <Download size={13} />
                            </button>
                          </div>
                        </td>
                      )}
                      <td>
                        <span className="font-mono text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                          {avance.codigoAvance}
                        </span>
                      </td>
                      <td className="text-slate-500 text-xs">{formatDate(avance.fechaEnvio)}</td>
                      <td className="font-medium text-slate-700">{avance.solicitante}</td>
                      <td className="text-slate-500 text-xs max-w-[160px] truncate" title={avance.descripcion}>
                        {avance.descripcion}
                      </td>
                      <td className="font-semibold text-slate-900">{formatCurrency(avance.valorAvance)}</td>
                      <td><EstadoBadge estado={avance.estado} /></td>
                      <td><TipoBadge tipo={avance.tipoAvance} /></td>
                      <td>
                        <div className="flex items-center gap-2">
                          <StatusCircle estado={avance.estadoReembolso} pulse={avance.estadoReembolso !== 'Reembolsado'} />
                          <span className="text-xs text-slate-500">{estadoReembolsoLabel[avance.estadoReembolso]}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {avancesFiltrados.length > 0 && (
            <Pagination
              page={paginaActual}
              pageSize={pageSize}
              totalItems={avancesFiltrados.length}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          )}
        </CardContent>
      </Card>

      {/* Modal crear */}
      <Modal
        open={showModal}
        onClose={() => { setShowModal(false); reset(); setCrearError(null) }}
        title="Nuevo Avance"
        size="md"
      >
        <form onSubmit={handleSubmit((d) => { if (excedeTope) return; setCrearError(null); crearMutation.mutate(d) })} className="space-y-4">
          {dashboard && (
            <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-teal-50 border border-teal-200 text-sm">
              <span className="text-teal-600 font-medium">Disponible en caja</span>
              <span className="font-bold text-teal-700">{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(dashboard.caja.disponible)}</span>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Código avance</Label>
              <div className="relative">
                <Hash size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input placeholder="REQ-0001" className="pl-8" {...register('codigoAvance')} error={!!errors.codigoAvance} />
              </div>
              {errors.codigoAvance && <p className="text-xs text-red-500">{errors.codigoAvance.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Fecha de envío</Label>
              <div className="relative">
                <Calendar size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input type="date" className="pl-8" {...register('fechaEnvio')} error={!!errors.fechaEnvio} />
              </div>
              {errors.fechaEnvio && <p className="text-xs text-red-500">{errors.fechaEnvio.message}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Valor del avance</Label>
            <div className="relative">
              <DollarSign size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input type="number" step="0.01" placeholder="0" className="pl-8" {...register('valorAvance')} error={!!errors.valorAvance || excedeTope} />
            </div>
            {errors.valorAvance && <p className="text-xs text-red-500">{errors.valorAvance.message}</p>}
            {!errors.valorAvance && valorAvance > 0 && (
              <p className={`text-xs font-medium ${excedeTope ? 'text-red-500' : 'text-slate-400'}`}>
                {excedeTope
                  ? `Excede el disponible (${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(disponible)})`
                  : `Quedaría disponible: ${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(quedaria)}`}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Solicitante</Label>
            <Select {...register('solicitante')}>
              <option value="">Seleccionar solicitante...</option>
              {solicitantes.map(s => (
                <option key={s.id} value={s.nombreCompleto}>{s.nombreCompleto}</option>
              ))}
            </Select>
            {errors.solicitante && <p className="text-xs text-red-500">{errors.solicitante.message}</p>}
            {solicitantes.length === 0 && (
              <p className="text-xs text-amber-600">No hay solicitantes asignados a esta caja. El Maestro puede asignarlos.</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Descripción</Label>
            <div className="relative">
              <FileText size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input placeholder="Descripción del gasto" className="pl-8" {...register('descripcion')} error={!!errors.descripcion} />
            </div>
            {errors.descripcion && <p className="text-xs text-red-500">{errors.descripcion.message}</p>}
          </div>

          {crearError && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {crearError}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => { setShowModal(false); reset(); setCrearError(null) }}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={excedeTope} loading={isSubmitting || crearMutation.isPending}>
              Guardar avance
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal editar */}
      <Modal
        open={!!editingAvance}
        onClose={() => { setEditingAvance(null); resetEdit() }}
        title="Editar Avance"
        size="md"
      >
        {editingAvance && (
          <form onSubmit={handleSubmitEdit((d) => editarMutation.mutate({ id: editingAvance.id, data: d }))} className="space-y-4">
            {editingAvance.estado === 'Legalizado' && (
              <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-700">
                <span className="shrink-0 mt-0.5">⚠️</span>
                <span>Este avance ya está legalizado. No se puede modificar el valor.</span>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Código avance</Label>
                <div className="relative">
                  <Hash size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input placeholder="REQ-0001" className="pl-8" {...registerEdit('codigoAvance')} error={!!errorsEdit.codigoAvance} />
                </div>
                {errorsEdit.codigoAvance && <p className="text-xs text-red-500">{errorsEdit.codigoAvance.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Fecha de envío</Label>
                <div className="relative">
                  <Calendar size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input type="date" className="pl-8" {...registerEdit('fechaEnvio')} error={!!errorsEdit.fechaEnvio} />
                </div>
                {errorsEdit.fechaEnvio && <p className="text-xs text-red-500">{errorsEdit.fechaEnvio.message}</p>}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Valor del avance</Label>
              <div className="relative">
                <DollarSign size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0"
                  className="pl-8"
                  disabled={editingAvance.estado === 'Legalizado'}
                  {...registerEdit('valorAvance')}
                  error={!!errorsEdit.valorAvance}
                />
              </div>
              {errorsEdit.valorAvance && <p className="text-xs text-red-500">{errorsEdit.valorAvance.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Solicitante</Label>
              <Select {...registerEdit('solicitante')}>
                <option value="">Seleccionar solicitante...</option>
                {editingAvance && !solicitantes.some(s => s.nombreCompleto === editingAvance.solicitante) && editingAvance.solicitante && (
                  <option value={editingAvance.solicitante}>{editingAvance.solicitante}</option>
                )}
                {solicitantes.map(s => (
                  <option key={s.id} value={s.nombreCompleto}>{s.nombreCompleto}</option>
                ))}
              </Select>
              {errorsEdit.solicitante && <p className="text-xs text-red-500">{errorsEdit.solicitante.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Descripción</Label>
              <div className="relative">
                <FileText size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input placeholder="Descripción del gasto" className="pl-8" {...registerEdit('descripcion')} error={!!errorsEdit.descripcion} />
              </div>
              {errorsEdit.descripcion && <p className="text-xs text-red-500">{errorsEdit.descripcion.message}</p>}
            </div>

            {editarMutation.isError && (
              <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {(editarMutation.error as any)?.response?.data?.message ?? 'Error al guardar los cambios.'}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => { setEditingAvance(null); resetEdit() }}>
                Cancelar
              </Button>
              <Button type="submit" className="flex-1" loading={isSubmittingEdit || editarMutation.isPending}>
                Guardar cambios
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
