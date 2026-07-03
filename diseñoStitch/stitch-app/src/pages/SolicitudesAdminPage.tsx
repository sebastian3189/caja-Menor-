import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Inbox, Clock, CheckCircle2, XCircle, User as UserIcon, Download, FileText } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { getSolicitudes, aceptarSolicitud, rechazarSolicitud } from '@/api/solicitudes'
import { descargarPdfAvance } from '@/api/avances'
import { descargarBlob } from '@/lib/download'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { StatCard } from '@/components/ui/StatCard'
import { Modal } from '@/components/ui/Modal'
import { PageHeader } from '@/components/ui/PageHeader'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { SolicitudAvanceDto } from '@/types'

const estadoMeta = {
  Pendiente: { variant: 'warning', icon: Clock, label: 'Pendiente' },
  Aceptada: { variant: 'success', icon: CheckCircle2, label: 'Aceptada' },
  Rechazada: { variant: 'destructive', icon: XCircle, label: 'Rechazada' },
} as const

export function SolicitudesAdminPage() {
  const { user } = useAuthStore()
  const cajaId = user?.cajaId!
  const queryClient = useQueryClient()
  const [filtro, setFiltro] = useState<'Pendiente' | 'Todas'>('Pendiente')
  const [rechazando, setRechazando] = useState<SolicitudAvanceDto | null>(null)
  const [motivo, setMotivo] = useState('')

  const { data: solicitudes = [], isLoading } = useQuery({
    queryKey: ['solicitudes', cajaId],
    queryFn: () => getSolicitudes(cajaId),
    refetchOnMount: 'always',
    refetchInterval: 30000,
  })

  const invalidar = () => {
    queryClient.invalidateQueries({ queryKey: ['solicitudes', cajaId] })
    queryClient.invalidateQueries({ queryKey: ['solicitudes-pendientes', cajaId] })
    queryClient.invalidateQueries({ queryKey: ['avances', cajaId] })
    queryClient.invalidateQueries({ queryKey: ['resumen-avances', cajaId] })
    queryClient.invalidateQueries({ queryKey: ['dashboard', cajaId] })
  }

  const aceptarMutation = useMutation({
    mutationFn: (id: number) => aceptarSolicitud(cajaId, id),
    onSuccess: async (sol) => {
      invalidar()
      // Descargar automáticamente el PDF del avance generado
      if (sol.avanceId) {
        try {
          const blob = await descargarPdfAvance(cajaId, sol.avanceId)
          descargarBlob(blob, `Avance_${sol.codigoAvance ?? sol.avanceId}.pdf`)
        } catch { /* el PDF también se puede descargar luego desde Avances */ }
      }
    },
    onError: (e: any) => alert(e?.response?.data?.message ?? 'No se pudo aceptar la solicitud.'),
  })

  const rechazarMutation = useMutation({
    mutationFn: ({ id, motivo }: { id: number; motivo: string }) => rechazarSolicitud(cajaId, id, motivo),
    onSuccess: () => { invalidar(); setRechazando(null); setMotivo('') },
    onError: (e: any) => alert(e?.response?.data?.message ?? 'No se pudo rechazar la solicitud.'),
  })

  const lista = solicitudes.filter(s => filtro === 'Todas' || s.estado === 'Pendiente')
  const pendientes = solicitudes.filter(s => s.estado === 'Pendiente').length
  const aceptadas = solicitudes.filter(s => s.estado === 'Aceptada').length
  const rechazadas = solicitudes.filter(s => s.estado === 'Rechazada').length

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Solicitudes de avance"
        subtitle="Solicitudes enviadas por los solicitantes de tu caja"
        icon={Inbox}
        iconColor="text-fuchsia-600"
        iconBg="bg-fuchsia-100"
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Pendientes" value={pendientes} icon={Clock} iconColor="text-amber-600" iconBg="bg-amber-100" />
        <StatCard label="Aceptadas" value={aceptadas} icon={CheckCircle2} iconColor="text-emerald-600" iconBg="bg-emerald-100" />
        <StatCard label="Rechazadas" value={rechazadas} icon={XCircle} iconColor="text-rose-600" iconBg="bg-rose-100" />
      </div>

      <div className="flex gap-1">
        {(['Pendiente', 'Todas'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filtro === f ? 'bg-fuchsia-500 text-white' : 'bg-white text-slate-500 border border-slate-200 hover:border-fuchsia-300'
            }`}
          >
            {f === 'Pendiente' ? `Pendientes (${pendientes})` : 'Todas'}
          </button>
        ))}
      </div>

      <Card accent="violet">
        <CardHeader><CardTitle>Bandeja de solicitudes</CardTitle></CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-16 flex items-center justify-center gap-3 text-slate-400">
              <div className="w-5 h-5 border-2 border-fuchsia-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">Cargando...</span>
            </div>
          ) : lista.length === 0 ? (
            <div className="py-16 text-center">
              <Inbox size={32} className="text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-400">{filtro === 'Pendiente' ? 'No hay solicitudes pendientes' : 'No hay solicitudes'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="stitch-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Solicitante</th>
                    <th>Descripción</th>
                    <th>Valor</th>
                    <th>Estado</th>
                    <th>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {lista.map((s) => {
                    const meta = estadoMeta[s.estado]
                    const Icon = meta.icon
                    const cargando = aceptarMutation.isPending && aceptarMutation.variables === s.id
                    return (
                      <tr key={s.id}>
                        <td className="text-xs text-slate-500 whitespace-nowrap">{formatDate(s.fechaSolicitud)}</td>
                        <td>
                          <div className="flex items-center gap-1.5">
                            <UserIcon size={13} className="text-slate-400" />
                            <span className="font-medium text-slate-700">{s.nombreSolicitante}</span>
                          </div>
                        </td>
                        <td className="text-sm text-slate-600 max-w-[240px]">{s.descripcion}</td>
                        <td className="font-semibold text-slate-900">{formatCurrency(s.valorSolicitado)}</td>
                        <td>
                          <Badge variant={meta.variant}><Icon size={11} className="mr-1" />{meta.label}</Badge>
                        </td>
                        <td>
                          {s.estado === 'Pendiente' ? (
                            <div className="flex items-center gap-1.5">
                              <Button size="sm" variant="success" loading={cargando} onClick={() => aceptarMutation.mutate(s.id)}>
                                <CheckCircle2 size={13} /> Aceptar
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => { setRechazando(s); setMotivo('') }}>
                                <XCircle size={13} /> Rechazar
                              </Button>
                            </div>
                          ) : s.estado === 'Aceptada' && s.avanceId ? (
                            <button
                              onClick={async () => {
                                const blob = await descargarPdfAvance(cajaId, s.avanceId!)
                                descargarBlob(blob, `Avance_${s.codigoAvance ?? s.avanceId}.pdf`)
                              }}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100 transition-all"
                            >
                              <Download size={12} /> PDF {s.codigoAvance}
                            </button>
                          ) : (
                            <span className="text-xs text-rose-500 italic">{s.motivoRechazo || 'Rechazada'}</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal rechazar */}
      <Modal open={!!rechazando} onClose={() => { setRechazando(null); setMotivo('') }} title="Rechazar solicitud" size="sm">
        {rechazando && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
              <FileText size={16} className="text-slate-400 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-slate-700">{rechazando.nombreSolicitante} · {formatCurrency(rechazando.valorSolicitado)}</p>
                <p className="text-xs text-slate-500">{rechazando.descripcion}</p>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Motivo del rechazo (opcional)</Label>
              <Input placeholder="Ej. Fuera de presupuesto este mes" value={motivo} onChange={e => setMotivo(e.target.value)} />
            </div>
            <div className="flex gap-3">
              <Button type="button" variant="outline" className="flex-1" onClick={() => { setRechazando(null); setMotivo('') }}>Cancelar</Button>
              <Button type="button" variant="destructive" className="flex-1" loading={rechazarMutation.isPending}
                onClick={() => rechazarMutation.mutate({ id: rechazando.id, motivo })}>
                Rechazar solicitud
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
