import { useQuery } from '@tanstack/react-query'
import {
  LayoutDashboard,
  Wallet,
  FileText,
  DollarSign,
  TrendingDown,
  TrendingUp,
  CheckCircle2,
  Clock,
  AlertCircle,
  Calendar,
  User,
  Users,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { getDashboard } from '@/api/cajaMenor'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { StatCard } from '@/components/ui/StatCard'
import { PageHeader } from '@/components/ui/PageHeader'
import { formatCurrency, formatDateLong } from '@/lib/utils'

export function DashboardPage() {
  const { user } = useAuthStore()
  const cajaId = user?.cajaId

  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard', cajaId],
    queryFn: () => getDashboard(cajaId!),
    enabled: !!cajaId,
    refetchOnMount: 'always',
  })

  if (!cajaId) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center p-8 bg-white rounded-2xl border border-slate-200 shadow-sm max-w-md">
          <AlertCircle size={40} className="text-amber-500 mx-auto mb-3" />
          <p className="font-semibold text-slate-900">Sin caja asignada</p>
          <p className="text-sm text-slate-500 mt-1">
            Contacte al Director para que le asigne una caja.
          </p>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-slate-400">
          <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Cargando dashboard...</span>
        </div>
      </div>
    )
  }

  if (error || !data) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const apiMsg = (error as any)?.response?.data?.message || (error as any)?.response?.data?.detail || ''
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center p-8 bg-white rounded-2xl border border-red-200 shadow-sm max-w-md">
          <AlertCircle size={40} className="text-red-500 mx-auto mb-3" />
          <p className="font-semibold text-red-700">Error al cargar los datos</p>
          {apiMsg && <p className="text-xs text-red-400 mt-1 font-mono">{apiMsg}</p>}
          <p className="text-xs text-slate-400 mt-2">CajaId: {cajaId}</p>
        </div>
      </div>
    )
  }

  const { caja, avances, legalizaciones } = data
  const pctLegalizado = avances.total > 0 ? avances.porcentajeLegalizados : 0

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={caja.nombre}
        subtitle={`Central ${caja.nombreCentral}${caja.codigoCentral ? ` · ${caja.codigoCentral}` : ''}`}
        icon={LayoutDashboard}
        iconColor="text-indigo-600"
        iconBg="bg-indigo-100"
        actions={
          <Badge variant={caja.estado === 'Abierta' ? 'success' : 'secondary'}>
            {caja.estado}
          </Badge>
        }
      />

      {/* Financial stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Valor Apertura"
          value={formatCurrency(caja.valorApertura)}
          icon={DollarSign}
          iconColor="text-indigo-600"
          iconBg="bg-indigo-100"
        />
        <StatCard
          label="Disponible en Caja"
          value={formatCurrency(caja.disponible)}
          icon={TrendingUp}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-100"
        />
        <StatCard
          label="Total Usado"
          value={formatCurrency(caja.totalUsado)}
          icon={TrendingDown}
          iconColor="text-rose-600"
          iconBg="bg-rose-100"
        />
      </div>

      {/* Avances + Legalizaciones */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Avances card */}
        <Card accent="amber">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center">
                <Wallet size={14} className="text-amber-600" />
              </div>
              <CardTitle>Avances</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 bg-slate-50 rounded-xl">
                <p className="text-xs text-slate-500 mb-1">Total</p>
                <p className="text-xl font-bold text-slate-900">{avances.total}</p>
              </div>
              <div className="text-center p-3 bg-amber-50 rounded-xl">
                <p className="text-xs text-amber-600 mb-1">Pendientes</p>
                <p className="text-xl font-bold text-amber-700">{avances.pendientes}</p>
              </div>
              <div className="text-center p-3 bg-emerald-50 rounded-xl">
                <p className="text-xs text-emerald-600 mb-1">Legalizados</p>
                <p className="text-xl font-bold text-emerald-700">{avances.legalizados}</p>
              </div>
            </div>
            {avances.total > 0 && (
              <div>
                <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                  <span>Progreso de legalización</span>
                  <span className="font-semibold text-slate-700">{pctLegalizado.toFixed(0)}%</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-400 to-emerald-500 rounded-full transition-all duration-700"
                    style={{ width: `${pctLegalizado}%` }}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Legalizaciones card */}
        <Card accent="emerald">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center">
                <FileText size={14} className="text-emerald-600" />
              </div>
              <CardTitle>Legalizaciones</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 bg-slate-50 rounded-xl">
                <p className="text-xs text-slate-500 mb-1">Total</p>
                <p className="text-xl font-bold text-slate-900">{legalizaciones.total}</p>
              </div>
              <div className="text-center p-3 bg-amber-50 rounded-xl">
                <p className="text-xs text-amber-600 mb-1">Sin avance</p>
                <p className="text-xl font-bold text-amber-700">{legalizaciones.sinAvance}</p>
              </div>
              <div className="text-center p-3 bg-emerald-50 rounded-xl">
                <p className="text-xs text-emerald-600 mb-1">Con avance</p>
                <p className="text-xl font-bold text-emerald-700">{legalizaciones.conAvance}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 pt-1">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-500" />
                <span className="text-xs text-slate-600">
                  {legalizaciones.conAvance} asociadas a avances
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock size={14} className="text-amber-500" />
                <span className="text-xs text-slate-600">
                  {legalizaciones.sinAvance} sin avance
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Caja info */}
      <Card accent="indigo">
        <CardHeader>
          <CardTitle>Información de la Caja</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                <User size={14} className="text-slate-500" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Director</p>
                <p className="text-sm font-medium text-slate-900 mt-0.5">{caja.nombreDirector || '—'}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                <Users size={14} className="text-slate-500" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Administrador</p>
                <p className="text-sm font-medium text-slate-900 mt-0.5">{caja.nombreAdministrador || '—'}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                <Calendar size={14} className="text-slate-500" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Apertura</p>
                <p className="text-sm font-medium text-slate-900 mt-0.5">{formatDateLong(caja.fechaApertura)}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${caja.estado === 'Abierta' ? 'bg-emerald-100' : 'bg-slate-100'}`}>
                <div className={`w-3 h-3 rounded-full ${caja.estado === 'Abierta' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Estado</p>
                <p className={`text-sm font-semibold mt-0.5 ${caja.estado === 'Abierta' ? 'text-emerald-700' : 'text-slate-600'}`}>
                  {caja.estado}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
