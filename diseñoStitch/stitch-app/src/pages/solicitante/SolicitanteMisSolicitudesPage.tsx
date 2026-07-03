import { useQuery } from '@tanstack/react-query'
import { ListChecks, Send, Clock, CheckCircle2, XCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getMisSolicitudes } from '@/api/solicitudes'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { StatCard } from '@/components/ui/StatCard'
import { PageHeader } from '@/components/ui/PageHeader'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { SolicitudAvanceDto } from '@/types'

const estadoMeta = {
  Pendiente: { variant: 'warning', icon: Clock, label: 'Pendiente' },
  Aceptada: { variant: 'success', icon: CheckCircle2, label: 'Aceptada' },
  Rechazada: { variant: 'destructive', icon: XCircle, label: 'Rechazada' },
} as const

export function SolicitanteMisSolicitudesPage() {
  const navigate = useNavigate()
  const { data: solicitudes = [], isLoading } = useQuery({
    queryKey: ['mis-solicitudes'],
    queryFn: getMisSolicitudes,
    refetchOnMount: 'always',
    refetchInterval: 30000,
  })

  const pendientes = solicitudes.filter(s => s.estado === 'Pendiente').length
  const aceptadas = solicitudes.filter(s => s.estado === 'Aceptada').length
  const rechazadas = solicitudes.filter(s => s.estado === 'Rechazada').length

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Mis solicitudes"
        subtitle="Seguimiento de tus solicitudes de avance"
        icon={ListChecks}
        iconColor="text-indigo-600"
        iconBg="bg-indigo-100"
        actions={
          <Button onClick={() => navigate('/solicitante/solicitar')}>
            <Send size={15} /> Nueva solicitud
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Pendientes" value={pendientes} icon={Clock} iconColor="text-amber-600" iconBg="bg-amber-100" />
        <StatCard label="Aceptadas" value={aceptadas} icon={CheckCircle2} iconColor="text-emerald-600" iconBg="bg-emerald-100" />
        <StatCard label="Rechazadas" value={rechazadas} icon={XCircle} iconColor="text-rose-600" iconBg="bg-rose-100" />
      </div>

      <Card accent="indigo">
        <CardHeader><CardTitle>Historial de solicitudes</CardTitle></CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-16 flex items-center justify-center gap-3 text-slate-400">
              <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">Cargando...</span>
            </div>
          ) : solicitudes.length === 0 ? (
            <div className="py-16 text-center">
              <ListChecks size={32} className="text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-400">Aún no has enviado solicitudes</p>
              <Button variant="secondary" size="sm" className="mt-3" onClick={() => navigate('/solicitante/solicitar')}>
                Crear primera solicitud
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="stitch-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Descripción</th>
                    <th>Valor</th>
                    <th>Estado</th>
                    <th>Resultado</th>
                  </tr>
                </thead>
                <tbody>
                  {solicitudes.map((s: SolicitudAvanceDto) => {
                    const meta = estadoMeta[s.estado]
                    const Icon = meta.icon
                    return (
                      <tr key={s.id}>
                        <td className="text-xs text-slate-500 whitespace-nowrap">{formatDate(s.fechaSolicitud)}</td>
                        <td className="text-sm text-slate-700 max-w-[280px]">{s.descripcion}</td>
                        <td className="font-semibold text-slate-900">{formatCurrency(s.valorSolicitado)}</td>
                        <td>
                          <Badge variant={meta.variant}>
                            <Icon size={11} className="mr-1" />
                            {meta.label}
                          </Badge>
                        </td>
                        <td className="text-xs">
                          {s.estado === 'Aceptada' && s.codigoAvance && (
                            <span className="font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">{s.codigoAvance}</span>
                          )}
                          {s.estado === 'Rechazada' && (
                            <span className="text-rose-500 italic">{s.motivoRechazo || 'Sin motivo'}</span>
                          )}
                          {s.estado === 'Pendiente' && <span className="text-slate-300">—</span>}
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
    </div>
  )
}
