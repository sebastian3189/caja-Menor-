import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Wallet,
  FileText,
  RefreshCw,
  ClipboardList,
  LogOut,
  Building2,
  ChevronRight,
  X,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { cn } from '@/lib/utils'

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
}

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user, logout } = useAuthStore()

  const filteredItems = navItems.filter(
    (item) => user?.rol && item.roles.includes(user.rol)
  )

  const badge = user?.rol ? roleBadge[user.rol] : null

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
          <div className="mt-3 px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700">
            <p className="text-xs text-slate-400 mb-0.5">Caja activa</p>
            <p className="text-xs font-semibold text-slate-200 truncate" title={user.nombreCaja}>
              {user.nombreCaja}
            </p>
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
                  {isActive && (
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
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-semibold text-white truncate max-w-[130px]">
              {user?.nombreCompleto}
            </p>
            {badge && (
              <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0 ml-1', badge.className)}>
                {badge.label}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 truncate">{user?.email}</p>
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
