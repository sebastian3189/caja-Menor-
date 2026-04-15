import { NavLink } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: '📊', roles: ['Director', 'Administrador'] },
  { to: '/avances', label: 'Avances', icon: '💵', roles: ['Director', 'Administrador'] },
  { to: '/legalizaciones', label: 'Legalizaciones', icon: '📋', roles: ['Director', 'Administrador'] },
  { to: '/reembolsos', label: 'Reembolsos', icon: '🔄', roles: ['Director'] },
  { to: '/arqueo', label: 'Arqueo', icon: '📁', roles: ['Director', 'Administrador'] },
]

export function Sidebar() {
  const { user, logout } = useAuthStore()

  const filteredItems = navItems.filter(item =>
    user?.rol && item.roles.includes(user.rol)
  )

  return (
    <aside className="w-64 bg-teal-800 text-white flex flex-col min-h-screen">
      <div className="px-6 py-5 border-b border-teal-700">
        <h1 className="text-lg font-bold tracking-tight">Caja Menor</h1>
        <p className="text-teal-300 text-xs mt-0.5">MiraxionTech</p>
        {user?.nombreCaja && (
          <p className="text-teal-200 text-xs mt-2 font-medium truncate" title={user.nombreCaja}>
            📦 {user.nombreCaja}
          </p>
        )}
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {filteredItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-teal-600 text-white'
                  : 'text-teal-100 hover:bg-teal-700 hover:text-white'
              )
            }
          >
            <span className="text-base">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-teal-700">
        <div className="px-3 py-2 mb-2">
          <p className="text-sm font-medium text-white truncate">{user?.nombreCompleto}</p>
          <p className="text-xs text-teal-300">{user?.rol}</p>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-teal-100 hover:bg-teal-700 hover:text-white transition-colors"
        >
          <span className="text-base">🚪</span>
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
