import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Mail, Lock, ArrowRight, Building2, Shield, TrendingUp, BarChart3, Eye, EyeOff } from 'lucide-react'
import { login } from '@/api/auth'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'

// Ícono de Microsoft (SVG oficial — cuatro cuadros de colores)
function MicrosoftIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="1" width="9" height="9" fill="#F25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
      <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
      <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
    </svg>
  )
}

const loginSchema = z.object({
  email: z.string().email('Correo electrónico inválido'),
  password: z.string().min(1, 'La contraseña es requerida'),
})

type LoginForm = z.infer<typeof loginSchema>

const features = [
  { icon: BarChart3, label: 'Dashboard en tiempo real' },
  { icon: TrendingUp, label: 'Seguimiento de avances y legalizaciones' },
  { icon: Shield, label: 'Control de acceso por roles' },
]

export function LoginPage() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [msLoading, setMsLoading] = useState(false)

  const handleMicrosoftLogin = async () => {
    setMsLoading(true)
    setError(null)
    try {
      // TODO: integrar MSAL (@azure/msal-browser)
      // const result = await msalInstance.loginPopup({ scopes: ['openid', 'profile', 'email'] })
      // const response = await loginWithMicrosoft(result.idToken)
      // setAuth(response)
      // navigate('/dashboard')
    } finally {
      setMsLoading(false)
    }
  }

  const handleForgotPassword = () => {
    // TODO: redirigir al flujo de reset de contraseña de Azure AD
    // window.location.href = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/authorize?...&prompt=select_account`
    window.open('https://account.live.com/password/reset', '_blank', 'noopener')
  }

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) })

  const onSubmit = async (data: LoginForm) => {
    setError(null)
    try {
      const response = await login(data)
      setAuth(response)
      navigate('/dashboard')
    } catch {
      setError('Credenciales inválidas. Verifique su correo y contraseña.')
    }
  }

  return (
    <div className="min-h-screen flex bg-slate-950">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-[45%] flex-col justify-between p-10 relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800" />
        <div className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `radial-gradient(circle at 20% 80%, #ffffff22 0%, transparent 50%),
              radial-gradient(circle at 80% 20%, #a78bfa22 0%, transparent 50%)`
          }}
        />

        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '40px 40px',
          }}
        />

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/20">
              <Building2 size={20} className="text-white" />
            </div>
            <div>
              <p className="font-bold text-white text-lg leading-none">Caja Menor</p>
              <p className="text-indigo-200 text-xs mt-0.5">MiraxionTech</p>
            </div>
          </div>
        </div>

        <div className="relative z-10">
          <h2 className="text-4xl font-bold text-white leading-tight mb-3">
            Gestión de Caja Menor
          </h2>
          <p className="text-indigo-200 text-base leading-relaxed mb-8 max-w-sm">
            Sistema integral para el control de avances, legalizaciones y reembolsos de caja menor.
          </p>

          <div className="space-y-3">
            {features.map((feat, i) => {
              const Icon = feat.icon
              return (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center border border-white/15">
                    <Icon size={15} className="text-white" />
                  </div>
                  <span className="text-sm text-indigo-100">{feat.label}</span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-xs text-indigo-300">
            Acceso restringido a personal autorizado de MiraxionTech.
          </p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-[380px]">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center">
              <Building2 size={18} className="text-white" />
            </div>
            <div>
              <p className="font-bold text-slate-900 leading-none">Caja Menor</p>
              <p className="text-slate-500 text-xs">MiraxionTech</p>
            </div>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-900">Bienvenido</h1>
            <p className="text-slate-500 text-sm mt-1">Ingresa tus credenciales para continuar</p>
          </div>

          {/* Microsoft login */}
          <button
            type="button"
            onClick={handleMicrosoftLogin}
            disabled={msLoading}
            className="w-full h-11 flex items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-sm mb-6"
          >
            {msLoading ? (
              <span className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
            ) : (
              <MicrosoftIcon size={18} />
            )}
            Continuar con Microsoft
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-xs text-slate-400 shrink-0">o ingresa con tu correo</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email">Correo electrónico</Label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="usuario@miraxiontech.com"
                  autoComplete="email"
                  error={!!errors.email}
                  className="pl-10"
                  {...register('email')}
                />
              </div>
              {errors.email && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  error={!!errors.password}
                  className="pl-10 pr-11"
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1 rounded"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-red-500">{errors.password.message}</p>
              )}
              <div className="flex justify-end pt-0.5">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-xs text-indigo-600 hover:text-indigo-800 hover:underline transition-colors"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-11 text-sm"
              loading={isSubmitting}
            >
              Ingresar al sistema
              {!isSubmitting && <ArrowRight size={16} />}
            </Button>
          </form>

          <p className="mt-8 text-center text-xs text-slate-400">
            Sistema de Gestión de Caja Menor — MiraxionTech
          </p>
        </div>
      </div>
    </div>
  )
}
