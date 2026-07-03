import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { LoginResponse } from '@/types'
import { logoutServidor } from '@/api/auth'

interface AuthState {
  token: string | null
  user: LoginResponse | null
  isAuthenticated: boolean
  setAuth: (data: LoginResponse) => void
  clearMustChangePassword: () => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      setAuth: (data) => set({ token: data.token, user: data, isAuthenticated: true }),
      clearMustChangePassword: () =>
        set((s) => (s.user ? { user: { ...s.user, mustChangePassword: false } } : {})),
      logout: () => {
        // Revoca el token en el servidor (best-effort) antes de limpiar el estado local
        void logoutServidor()
        set({ token: null, user: null, isAuthenticated: false })
      },
    }),
    { name: 'stitch-auth' }
  )
)
