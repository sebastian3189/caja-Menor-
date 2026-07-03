import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { RefreshCw, CheckCircle2, Clock, Filter, X, XCircle, Paperclip, Send, FileText } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { getReembolsos, activarReembolsos, confirmarReembolsos, cancelarReembolso } from '@/api/reembolsos'

import { enviarTesoreria } from '@/api/arqueo'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { StatCard } from '@/components/ui/StatCard'
import { StatusCircle } from '@/components/ui/StatusCircle'
import { PageHeader } from '@/components/ui/PageHeader'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { ReembolsoDto } from '@/types'

function EstadoBadge({ estado }: { estado: ReembolsoDto['estado'] }) {
  const map = { SinReembolso: 'warning', EnProceso: 'info', Reembolsado: 'success' } as const
  const labels = { SinReembolso: 'Sin reembolso', EnProceso: 'En proceso', Reembolsado: 'Reembolsado' }
  return <Badge variant={map[estado]}>{labels[estado]}</Badge>
}

function ReembolsoTable({
  reembolsos,
  showConfirmacion = false,
  onCancelar,
  cancelandoId,
}: {
  reembolsos: ReembolsoDto[]
  showConfirmacion?: boolean
  onCancelar?: (id: number) => void
  cancelandoId?: number | null
}) {
  return (
    <div className="overflow-x-auto">
      <table className="stitch-table">
        <thead>
          <tr>
            <th>Legalización</th>
            <th>Avance</th>
            <th>Central</th>
            <th>V. Avance</th>
            <th>V. Legalizado</th>
            <th>Ellos Deben</th>
            <th>Debemos</th>
            <th>Monto</th>
            <th>Estado</th>
            {showConfirmacion && <th>Confirmado</th>}
            {onCancelar && <th></th>}
          </tr>
        </thead>
        <tbody>
          {reembolsos.map((r) => (
            <tr key={r.id}>
              <td>
                <span className="font-mono text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                  {r.codigoLegalizacion}
                </span>
              </td>
              <td>
                {r.codigoAvance ? (
                  <span className="font-mono text-xs text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                    {r.codigoAvance}
                  </span>
                ) : (
                  <span className="text-slate-300 text-xs">—</span>
                )}
              </td>
              <td className="text-xs text-slate-500">{r.codigoCentral}</td>
              <td className="text-sm">{formatCurrency(r.valorAvance)}</td>
              <td className="text-sm">{formatCurrency(r.valorLegalizado)}</td>
              <td className="text-sm font-medium text-amber-600">{formatCurrency(r.debe)}</td>
              <td className="text-sm font-medium text-blue-600">{formatCurrency(r.debemos)}</td>
              <td className="font-bold text-slate-900">{formatCurrency(r.monto)}</td>
              <td>
                <div className="flex items-center gap-2">
                  <StatusCircle estado={r.estado} pulse={r.estado === 'EnProceso'} />
                  <EstadoBadge estado={r.estado} />
                </div>
              </td>
              {showConfirmacion && (
                <td className="text-xs text-slate-500">
                  {r.fechaConfirmacion ? formatDate(r.fechaConfirmacion) : '—'}
                </td>
              )}
              {onCancelar && (
                <td>
                  <button
                    onClick={() => onCancelar(r.id)}
                    disabled={cancelandoId === r.id}
                    title="Cancelar reembolso"
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-red-600 border border-red-200 bg-red-50 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {cancelandoId === r.id ? (
                      <span className="w-3.5 h-3.5 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <XCircle size={13} />
                    )}
                    Cancelar
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function ReembolsosPage() {
  const { user } = useAuthStore()
  const cajaId = user?.cajaId!
  const queryClient = useQueryClient()
  const isDirector = user?.rol === 'Director'
  const isAdmin = user?.rol === 'Administrador'
  const [filtroFechaDesde, setFiltroFechaDesde] = useState('')
  const [filtroFechaHasta, setFiltroFechaHasta] = useState('')
  const hayFiltros = filtroFechaDesde || filtroFechaHasta
  const pdfRef = useRef<HTMLInputElement>(null)
  const [arqueoFile, setArqueoFile] = useState<File | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['reembolsos', cajaId],
    queryFn: () => getReembolsos(cajaId),
    refetchOnMount: 'always',
  })


  const confirmarMutation = useMutation({
    mutationFn: () => confirmarReembolsos(cajaId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reembolsos', cajaId] })
      queryClient.invalidateQueries({ queryKey: ['legalizaciones', cajaId] })
    },
  })

  const cancelarMutation = useMutation({
    mutationFn: (reembolsoId: number) => cancelarReembolso(cajaId, reembolsoId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reembolsos', cajaId] })
      queryClient.invalidateQueries({ queryKey: ['legalizaciones', cajaId] })
    },
  })

  const enviarMutation = useMutation({
    mutationFn: async () => {
      await activarReembolsos(cajaId)
      await enviarTesoreria(cajaId)
    },
    onSuccess: () => {
      setArqueoFile(null)
      queryClient.invalidateQueries({ queryKey: ['reembolsos', cajaId] })
      queryClient.invalidateQueries({ queryKey: ['legalizaciones', cajaId] })
      queryClient.invalidateQueries({ queryKey: ['arqueo', cajaId] })
    },
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-slate-400">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Cargando reembolsos...</span>
        </div>
      </div>
    )
  }

  const todosPendientes = data?.sinReembolso ?? []
  const historico = data?.historico ?? []
  const totalPendiente = data?.totalPendiente ?? 0
  const estadoTesoreria = data?.estadoTesoreria ?? null
  const tesoreriaAcepto = estadoTesoreria === 'Aceptado'

  const filtrarPorFecha = (r: ReembolsoDto) => {
    const fecha = new Date(r.fechaReembolso)
    if (filtroFechaDesde && fecha < new Date(filtroFechaDesde)) return false
    if (filtroFechaHasta && fecha > new Date(filtroFechaHasta + 'T23:59:59')) return false
    return true
  }

  const sinReembolso = todosPendientes.filter(r => r.estado === 'SinReembolso').filter(filtrarPorFecha)
  const enProceso = todosPendientes.filter(r => r.estado === 'EnProceso').filter(filtrarPorFecha)
  const reembolsados = historico.filter(r => r.estado === 'Reembolsado').filter(filtrarPorFecha)

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Sala de Reembolsos"
        subtitle="Gestión del proceso de reembolsos a Tesorería"
        icon={RefreshCw}
        iconColor="text-blue-600"
        iconBg="bg-blue-100"
      />

      {/* Estado de la respuesta de Tesorería al arqueo enviado */}
      {estadoTesoreria === 'Denegado' && (
        <div className="flex items-start gap-3 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          <XCircle size={18} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Tesorería denegó el arqueo</p>
            <p className="text-red-600/90">Los reembolsos volvieron a "Sin reembolso". Corrige lo necesario y reinicia el proceso (adjunta el arqueo y vuelve a enviarlo a Tesorería).</p>
          </div>
        </div>
      )}
      {estadoTesoreria === 'Aceptado' && enProceso.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700">
          <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
          <p><span className="font-semibold">Tesorería aceptó el arqueo.</span> El Director ya puede confirmar los reembolsos para pasarlos al histórico.</p>
        </div>
      )}
      {estadoTesoreria === 'Pendiente' && enProceso.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700">
          <Clock size={18} className="shrink-0 mt-0.5" />
          <p><span className="font-semibold">Esperando aceptación de Tesorería.</span> Cuando acepte el arqueo desde el correo, se habilitará el botón para confirmar los reembolsos.</p>
        </div>
      )}

      {/* Summary stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Pendientes de iniciar"
          value={sinReembolso.length}
          icon={Clock}
          iconColor="text-amber-600"
          iconBg="bg-amber-100"
        />
        <StatCard
          label="En proceso"
          value={enProceso.length}
          icon={RefreshCw}
          iconColor="text-blue-600"
          iconBg="bg-blue-100"
        />
        <StatCard
          label="Reembolsados"
          value={reembolsados.length}
          icon={CheckCircle2}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-100"
        />
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3 px-4 py-3 bg-slate-50 rounded-xl border border-slate-200">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 shrink-0">
          <Filter size={13} />
          Filtros
        </div>
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-400">Desde:</span>
            <input
              type="date"
              value={filtroFechaDesde}
              onChange={e => setFiltroFechaDesde(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white text-slate-700 focus:outline-none focus:border-blue-400"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-400">Hasta:</span>
            <input
              type="date"
              value={filtroFechaHasta}
              onChange={e => setFiltroFechaHasta(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white text-slate-700 focus:outline-none focus:border-blue-400"
            />
          </div>
          {hayFiltros && (
            <button
              onClick={() => { setFiltroFechaDesde(''); setFiltroFechaHasta('') }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-red-500 border border-red-200 bg-red-50 hover:bg-red-100 transition-all"
            >
              <X size={11} /> Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Pending — SinReembolso */}
      <Card accent="amber">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-3 justify-between">
            <div className="flex items-center gap-2">
              <StatusCircle estado="SinReembolso" size="md" pulse />
              <CardTitle>
                Pendientes de iniciar
                <span className="ml-2 text-xs font-normal text-slate-400">({sinReembolso.length})</span>
              </CardTitle>
            </div>
            {sinReembolso.length > 0 && (
              <div className="text-right">
                <p className="text-xs text-slate-500">Total pendiente</p>
                <p className="text-sm font-bold text-slate-900">{formatCurrency(totalPendiente)}</p>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {sinReembolso.length === 0 ? (
            <div className="py-12 text-center">
              <CheckCircle2 size={28} className="text-emerald-400 mx-auto mb-2" />
              <p className="text-sm text-slate-400">No hay reembolsos pendientes de iniciar</p>
            </div>
          ) : (
            <ReembolsoTable
              reembolsos={sinReembolso}
              onCancelar={isDirector ? (id) => cancelarMutation.mutate(id) : undefined}
              cancelandoId={cancelarMutation.isPending ? (cancelarMutation.variables as number) : null}
            />
          )}

          {/* Adjuntar PDF y enviar a Tesorería */}
          {(isAdmin || isDirector) && (
            <div className="px-4 py-4 border-t border-slate-100 bg-slate-50/60">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                Envío a Tesorería
              </p>
              <input
                ref={pdfRef}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={(e) => setArqueoFile(e.target.files?.[0] ?? null)}
              />
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => pdfRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-600 border border-slate-200 bg-white hover:bg-slate-100 transition-all"
                >
                  <Paperclip size={13} />
                  {arqueoFile ? 'Cambiar PDF' : 'Adjuntar PDF del arqueo'}
                </button>

                {arqueoFile && (
                  <>
                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-700 max-w-[220px]">
                      <FileText size={13} className="shrink-0 text-blue-500" />
                      <span className="truncate">{arqueoFile.name}</span>
                      <button
                        onClick={() => setArqueoFile(null)}
                        className="ml-1 text-blue-400 hover:text-blue-600 shrink-0"
                      >
                        <X size={11} />
                      </button>
                    </div>

                    <Button
                      variant="success"
                      size="sm"
                      loading={enviarMutation.isPending}
                      disabled={sinReembolso.length === 0}
                      onClick={() => enviarMutation.mutate()}
                    >
                      <Send size={14} />
                      Enviar a Tesorería
                    </Button>
                  </>
                )}
              </div>

              {!arqueoFile && (
                <p className="text-xs text-slate-400 mt-2">
                  Adjunta el PDF del arqueo firmado para habilitarlo envío.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* En proceso */}
      {enProceso.length > 0 && (
        <Card accent="blue">
          <CardHeader>
            <div className="flex flex-wrap items-center gap-3 justify-between">
              <div className="flex items-center gap-2">
                <StatusCircle estado="EnProceso" size="md" pulse />
                <CardTitle>
                  En proceso
                  <span className="ml-2 text-xs font-normal text-slate-400">({enProceso.length})</span>
                </CardTitle>
              </div>
              {isDirector && (
                <Button
                  variant="success"
                  size="sm"
                  loading={confirmarMutation.isPending}
                  disabled={!tesoreriaAcepto}
                  title={tesoreriaAcepto ? undefined : 'Tesorería debe aceptar el arqueo antes de confirmar'}
                  onClick={() => confirmarMutation.mutate()}
                >
                  <CheckCircle2 size={14} />
                  {tesoreriaAcepto ? 'Confirmar reembolsos' : 'Esperando a Tesorería'}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ReembolsoTable reembolsos={enProceso} />
          </CardContent>
        </Card>
      )}

      {/* Histórico */}
      <Card accent="emerald">
        <CardHeader>
          <div className="flex items-center gap-2">
            <StatusCircle estado="Reembolsado" size="md" />
            <CardTitle>
              Histórico reembolsados
              <span className="ml-2 text-xs font-normal text-slate-400">({reembolsados.length})</span>
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {reembolsados.length === 0 ? (
            <div className="py-12 text-center">
              <RefreshCw size={28} className="text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-400">No hay reembolsos confirmados aún</p>
            </div>
          ) : (
            <ReembolsoTable reembolsos={reembolsados} showConfirmacion />
          )}
        </CardContent>
      </Card>

    </div>
  )
}
