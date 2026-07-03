import { useState } from 'react'
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
  ArrowLeftRight,
  History,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { getDashboard } from '@/api/cajaMenor'
import { getArqueo } from '@/api/arqueo'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { StatCard } from '@/components/ui/StatCard'
import { PageHeader } from '@/components/ui/PageHeader'
import { StackedBar } from '@/components/ui/StackedBar'
import { BarChart } from '@/components/ui/BarChart'
import { formatCurrency, formatDateLong, formatCompactCurrency } from '@/lib/utils'

// Colores semánticos financieros (paleta validada: peor par CVD ΔE 21.3)
const C = {
  disponible: '#059669', // emerald-600 — dinero disponible
  usado: '#e11d48',      // rose-600 — total usado
  pendiente: '#d97706',  // amber-600 — pendiente
  conAvance: '#0d9488',  // teal-600 — con avance / legalizado
  movimientos: '#0d9488', // hue único para magnitud
}

/** Color de salud según % disponible (severidad: verde → ámbar → rojo). */
function healthColor(pct: number): string {
  if (pct >= 50) return C.disponible
  if (pct >= 25) return C.pendiente
  return C.usado
}

export function DashboardPage() {
  const { user } = useAuthStore()
  const cajaId = user?.cajaId
  const [showHistorico, setShowHistorico] = useState(false)

  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard', cajaId],
    queryFn: () => getDashboard(cajaId!),
    enabled: !!cajaId,
    refetchOnMount: 'always',
  })

  // Arqueo: aporta el desglose monetario de movimientos (gráfica de barras).
  // No bloquea el dashboard si aún no existe arqueo.
  const { data: arqueo } = useQuery({
    queryKey: ['arqueo', cajaId],
    queryFn: () => getArqueo(cajaId!),
    enabled: !!cajaId,
    retry: false,
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
  const pctDisponible = caja.valorApertura > 0 ? (caja.disponible / caja.valorApertura) * 100 : 0
  const saludColor = healthColor(pctDisponible)

  // Datos para la gráfica de movimientos (magnitud → barra horizontal, 1 hue)
  const mov = arqueo?.resumenMovimientos
  const movimientos = mov
    ? [
        { label: 'Avances por legalizar', value: mov.valorAvancesPendientesLegalizar, count: mov.avancesPendientesLegalizar },
        { label: 'Avances por reembolsar', value: mov.valorAvancesPendientesReembolso, count: mov.avancesPendientesReembolso },
        { label: 'Legaliz. con avance', value: mov.valorLegalizacionesConAvance, count: mov.legalizacionesConAvance },
        { label: 'Legaliz. sin avance', value: mov.valorLegalizacionesSinAvance, count: mov.legalizacionesSinAvance },
        { label: 'Reembolsos pendientes', value: mov.valorReembolsosSinReembolsar, count: mov.reembolsosSinReembolsar },
      ].filter(d => d.value > 0)
    : []

  // Histórico (reembolsados) — se muestra aparte y se puede ocultar
  const historico = [
    { label: 'Avances reembolsados', value: avances.valorReembolsados, count: avances.reembolsados },
    { label: 'Legalizaciones reembolsadas', value: legalizaciones.valorReembolsadas, count: legalizaciones.reembolsadas },
  ].filter(d => d.count > 0)
  const hayHistorico = historico.length > 0

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

      {/* ── Salud financiera: KPI row + barra apilada (parte-a-todo + ratio) ── */}
      <Card accent="indigo">
        <CardHeader>
          <CardTitle>Salud financiera de la caja</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
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

          {/* Barra de composición = medidor de salud */}
          <div>
            <div className="flex items-end justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Composición del saldo
              </span>
              <span className="text-2xl font-bold tabular-nums" style={{ color: saludColor }}>
                {pctDisponible.toFixed(0)}%
                <span className="text-xs font-medium text-slate-400 ml-1.5">disponible</span>
              </span>
            </div>
            <StackedBar
              height={32}
              formatValue={formatCurrency}
              segments={[
                { label: 'Disponible', value: caja.disponible, color: saludColor },
                { label: 'Usado', value: caja.totalUsado, color: C.usado },
              ]}
            />
          </div>
        </CardContent>
      </Card>

      {/* ── Avances (progreso) + Legalizaciones (parte-a-todo) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Avances: medidor de progreso pendiente → legalizado */}
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
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-slate-900 tabular-nums">{avances.total}</span>
              <span className="text-sm text-slate-400">avances activos (pendientes por reembolsar)</span>
            </div>
            {avances.total > 0 ? (
              <>
                <StackedBar
                  height={24}
                  formatValue={(v) => `${v}`}
                  segments={[
                    { label: 'Legalizados', value: avances.legalizados, color: C.conAvance },
                    { label: 'Pendientes', value: avances.pendientes, color: C.pendiente },
                  ]}
                />
                <div className="flex justify-between text-xs text-slate-500 pt-1">
                  <span>Progreso de legalización</span>
                  <span className="font-semibold" style={{ color: C.conAvance }}>{pctLegalizado.toFixed(0)}%</span>
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-400 py-4 text-center">No hay avances registrados</p>
            )}
          </CardContent>
        </Card>

        {/* Legalizaciones: barra apilada con/sin avance */}
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
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-slate-900 tabular-nums">{legalizaciones.total}</span>
              <span className="text-sm text-slate-400">legalizaciones activas (sin reembolsar)</span>
            </div>
            {legalizaciones.total > 0 ? (
              <StackedBar
                height={24}
                formatValue={(v) => `${v}`}
                segments={[
                  { label: 'Con avance', value: legalizaciones.conAvance, color: C.conAvance },
                  { label: 'Sin avance', value: legalizaciones.sinAvance, color: C.pendiente },
                ]}
              />
            ) : (
              <p className="text-sm text-slate-400 py-4 text-center">No hay legalizaciones registradas</p>
            )}
            <div className="flex items-center gap-4 pt-1">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-teal-500" />
                <span className="text-xs text-slate-600">{legalizaciones.conAvance} asociadas a avances</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock size={14} className="text-amber-500" />
                <span className="text-xs text-slate-600">{legalizaciones.sinAvance} sin avance</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Movimientos: comparar magnitud entre 5 categorías (barra horizontal) ── */}
      {movimientos.length > 0 && (
        <Card accent="teal">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-teal-100 flex items-center justify-center">
                <ArrowLeftRight size={14} className="text-teal-600" />
              </div>
              <CardTitle>Movimientos por valor</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <BarChart
              data={movimientos}
              color={C.movimientos}
              formatValue={formatCompactCurrency}
            />
            <p className="text-xs text-slate-400 mt-4 pt-3 border-t border-slate-100">
              Desglose del último arqueo del {arqueo ? formatDateLong(arqueo.fechaArqueo) : '—'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* ── Histórico (reembolsados) — gráfico ocultable ── */}
      {hayHistorico && (
        <Card accent="emerald">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <History size={14} className="text-emerald-600" />
                </div>
                <CardTitle>Histórico reembolsado</CardTitle>
              </div>
              <button
                onClick={() => setShowHistorico(v => !v)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
              >
                {showHistorico ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                {showHistorico ? 'Ocultar' : 'Ver histórico'}
              </button>
            </div>
          </CardHeader>
          {showHistorico && (
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <StatCard
                  label="Avances reembolsados"
                  value={`${avances.reembolsados} · ${formatCompactCurrency(avances.valorReembolsados)}`}
                  icon={Wallet}
                  iconColor="text-emerald-600"
                  iconBg="bg-emerald-100"
                />
                <StatCard
                  label="Legalizaciones reembolsadas"
                  value={`${legalizaciones.reembolsadas} · ${formatCompactCurrency(legalizaciones.valorReembolsadas)}`}
                  icon={FileText}
                  iconColor="text-teal-600"
                  iconBg="bg-teal-100"
                />
              </div>
              <BarChart data={historico} color={C.conAvance} formatValue={formatCompactCurrency} />
              <p className="text-xs text-slate-400 pt-3 border-t border-slate-100">
                Registros ya reembolsados. No se cuentan en las tarjetas de arriba (que muestran solo lo pendiente).
              </p>
            </CardContent>
          )}
        </Card>
      )}

      {/* ── Info de la caja (datos, no gráfica) ── */}
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
