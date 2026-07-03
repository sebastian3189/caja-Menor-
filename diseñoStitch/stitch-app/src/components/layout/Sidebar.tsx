import { NavLink } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  LayoutDashboard,
  Wallet,
  FileText,
  RefreshCw,
  ClipboardList,
  ShieldCheck,
  LogOut,
  Building2,
  ChevronRight,
  X,
  Users,
  Landmark,
  Archive,
  Inbox,
  Send,
  ListChecks,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { getLegalizaciones } from '@/api/legalizaciones'
import { getReembolsos } from '@/api/reembolsos'
import { getDashboard } from '@/api/cajaMenor'
import { getSolicitudesPendientes } from '@/api/solicitudes'
import { cn, formatCurrency } from '@/lib/utils'

interface NavItem {
  to: string
  label: string
  icon: React.ElementType
  roles: string[]
  color: string
  bgColor: string
}

const navItems: NavItem[] = [
  {
    to: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    roles: ['Director', 'Administrador'],
    color: 'text-indigo-400',
    bgColor: 'bg-indigo-500/10',
  },
  {
    to: '/avances',
    label: 'Avances',
    icon: Wallet,
    roles: ['Director', 'Administrador'],
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
  },
  {
    to: '/legalizaciones',
    label: 'Legalizaciones',
    icon: FileText,
    roles: ['Director', 'Administrador'],
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
  },
  {
    to: '/solicitudes',
    label: 'Solicitudes',
    icon: Inbox,
    roles: ['Administrador'],
    color: 'text-fuchsia-400',
    bgColor: 'bg-fuchsia-500/10',
  },
  {
    to: '/reembolsos',
    label: 'Reembolsos',
    icon: RefreshCw,
    roles: ['Director', 'Administrador'],
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
  },
  {
    to: '/arqueo',
    label: 'Arqueo',
    icon: ClipboardList,
    roles: ['Director', 'Administrador'],
    color: 'text-violet-400',
    bgColor: 'bg-violet-500/10',
  },
  {
    to: '/auditoria',
    label: 'Auditoría',
    icon: ShieldCheck,
    roles: ['Director', 'Maestro'],
    color: 'text-rose-400',
    bgColor: 'bg-rose-500/10',
  },
  {
    to: '/maestro/usuarios',
    label: 'Usuarios',
    icon: Users,
    roles: ['Maestro'],
    color: 'text-indigo-400',
    bgColor: 'bg-indigo-500/10',
  },
  {
    to: '/maestro/centrales',
    label: 'Centrales',
    icon: Landmark,
    roles: ['Maestro'],
    color: 'text-teal-400',
    bgColor: 'bg-teal-500/10',
  },
  {
    to: '/maestro/cajas',
    label: 'Cajas',
    icon: Archive,
    roles: ['Maestro'],
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
  },
  {
    to: '/solicitante/solicitar',
    label: 'Solicitar avance',
    icon: Send,
    roles: ['Solicitante'],
    color: 'text-teal-400',
    bgColor: 'bg-teal-500/10',
  },
  {
    to: '/solicitante/mis-solicitudes',
    label: 'Mis solicitudes',
    icon: ListChecks,
    roles: ['Solicitante'],
    color: 'text-indigo-400',
    bgColor: 'bg-indigo-500/10',
  },
]

const roleBadge: Record<string, { label: string; className: string }> = {
  Director: {
    label: 'Director',
    className: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
  },
  Administrador: {
    label: 'Administrador',
    className: 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30',
  },
  Maestro: {
    label: 'Maestro',
    className: 'bg-rose-500/20 text-rose-300 border border-rose-500/30',
  },
  Solicitante: {
    label: 'Solicitante',
    className: 'bg-teal-500/20 text-teal-300 border border-teal-500/30',
  },
}

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user, logout } = useAuthStore()
  const cajaId = user?.cajaId
  const esAdmin = user?.rol === 'Administrador'
  const esOperativo = user?.rol === 'Director' || user?.rol === 'Administrador'

  // Contadores para badges de notificación (consultas cacheadas, compartidas con las páginas)
  const { data: legalizaciones = [] } = useQuery({
    queryKey: ['legalizaciones', cajaId],
    queryFn: () => getLegalizaciones(cajaId!),
    enabled: !!cajaId && esOperativo,
  })
  const { data: reembolsos } = useQuery({
    queryKey: ['reembolsos', cajaId],
    queryFn: () => getReembolsos(cajaId!),
    enabled: !!cajaId && esOperativo,
  })
  const { data: dashboard } = useQuery({
    queryKey: ['dashboard', cajaId],
    queryFn: () => getDashboard(cajaId!),
    enabled: !!cajaId && esOperativo,
  })
  const { data: solicitudesPendientes = [] } = useQuery({
    queryKey: ['solicitudes-pendientes', cajaId],
    queryFn: () => getSolicitudesPendientes(cajaId!),
    enabled: !!cajaId && esAdmin,
    refetchInterval: 30000, // refrescar la notificación cada 30s
  })

  const badgeCounts: Record<string, number> = {
    '/legalizaciones': legalizaciones.filter(l => l.estadoReembolso === 'SinReembolso').length,
    '/reembolsos': (reembolsos?.sinReembolso ?? []).filter(r => r.estado === 'EnProceso').length,
    '/solicitudes': solicitudesPendientes.length,
  }

  // Indicador de saldo (SPEC 3.6.3): color por severidad como en el dashboard
  const caja = dashboard?.caja
  const pctDisponible = caja && caja.valorApertura > 0 ? (caja.disponible / caja.valorApertura) * 100 : 0
  const saldoColor = pctDisponible >= 50 ? 'text-emerald-400' : pctDisponible >= 25 ? 'text-amber-400' : 'text-rose-400'
  const saldoDot = pctDisponible >= 50 ? 'bg-emerald-400' : pctDisponible >= 25 ? 'bg-amber-400' : 'bg-rose-400'

  const filteredItems = navItems.filter(
    (item) => user?.rol && item.roles.includes(user.rol)
  )

  const badge = user?.rol ? roleBadge[user.rol] : null

  // Iniciales del usuario para el avatar (SPEC 3.6.4)
  const iniciales = (user?.nombreCompleto ?? '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0]?.toUpperCase())
    .join('') || '?'

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

    <aside className={cn(
      'fixed lg:static inset-y-0 left-0 z-40 w-64 bg-slate-900 text-white flex flex-col min-h-screen shrink-0 transition-transform duration-300',
      isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
    )}>
      {/* Logo */}
      <div className="px-5 py-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0">
            <Building2 size={18} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white leading-tight">Caja Menor</p>
            <p className="text-xs text-slate-500 mt-0.5">MiraxionTech</p>
          </div>
          {/* Close button — only on mobile */}
          <button
            onClick={onClose}
            className="lg:hidden w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {user?.nombreCaja && (
          <div className="mt-3 px-2.5 py-2 rounded-lg bg-slate-800 border border-slate-700">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', caja ? saldoDot : 'bg-slate-500')} />
              <p className="text-xs text-slate-400">Caja activa</p>
            </div>
            <p className="text-xs font-semibold text-slate-200 truncate" title={user.nombreCaja}>
              {user.nombreCaja}
            </p>
            {caja && (
              <div className="mt-2 pt-2 border-t border-slate-700">
                <p className="text-[10px] text-slate-500 uppercase tracking-wide">Disponible</p>
                <p className={cn('text-sm font-bold tabular-nums', saldoColor)}>
                  {formatCurrency(caja.disponible)}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-5 space-y-0.5 overflow-y-auto">
        <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-600">
          Módulos
        </p>
        {filteredItems.map((item) => {
          const Icon = item.icon
          const count = badgeCounts[item.to] ?? 0
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  'group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                  isActive
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cn(
                      'w-8 h-8 flex items-center justify-center rounded-lg transition-all',
                      isActive ? item.bgColor : 'bg-transparent group-hover:bg-slate-700/50'
                    )}
                  >
                    <Icon
                      size={16}
                      className={isActive ? item.color : 'text-slate-500 group-hover:text-slate-300'}
                    />
                  </span>
                  <span className="flex-1">{item.label}</span>
                  {count > 0 && (
                    <span
                      className="min-w-[20px] h-5 px-1.5 flex items-center justify-center rounded-full bg-red-500 text-white text-[11px] font-bold tabular-nums"
                      title={`${count} pendiente${count !== 1 ? 's' : ''}`}
                    >
                      {count > 99 ? '99+' : count}
                    </span>
                  )}
                  {isActive && count === 0 && (
                    <ChevronRight size={14} className="text-slate-500" />
                  )}
                </>
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* User info + logout */}
      <div className="px-3 py-4 border-t border-slate-800">
        <div className="px-3 py-2.5 rounded-xl bg-slate-800 mb-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center shrink-0 text-xs font-bold text-white">
              {iniciales}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <p className="text-xs font-semibold text-white truncate">
                  {user?.nombreCompleto}
                </p>
                {badge && (
                  <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0', badge.className)}>
                    {badge.label}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 truncate">{user?.email}</p>
            </div>
          </div>
        </div>

        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <LogOut size={15} />
          Cerrar sesión
        </button>
      </div>
    </aside>
    </>
  )
}
