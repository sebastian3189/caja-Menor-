import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Lock, KeyRound, Building2, Eye, EyeOff, ShieldCheck } from 'lucide-react'
import { cambiarPassword } from '@/api/auth'
import { useAuthStore } from '@/store/authStore'
import { rutaHomePorRol } from '@/components/layout/ProtectedRoute'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'

const fuerte = z.string()
  .min(8, 'Mínimo 8 caracteres')
  .regex(/[A-Z]/, 'Debe incluir una mayúscula')
  .regex(/[a-z]/, 'Debe incluir una minúscula')
  .regex(/[0-9]/, 'Debe incluir un número')
  .regex(/[^A-Za-z0-9]/, 'Debe incluir un carácter especial')

const schema = z.object({
  passwordActual: z.string().min(1, 'Requerido'),
  nuevaPassword: fuerte,
  confirmar: z.string().min(1, 'Requerido'),
}).refine(d => d.nuevaPassword === d.confirmar, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmar'],
})
type Form = z.infer<typeof schema>

export function CambiarPasswordPage() {
  const navigate = useNavigate()
  const { user, clearMustChangePassword } = useAuthStore()
  const forzado = !!user?.mustChangePassword
  const [error, setError] = useState<string | null>(null)
  const [show, setShow] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Form>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: Form) => {
    setError(null)
    try {
      await cambiarPassword({ passwordActual: data.passwordActual, nuevaPassword: data.nuevaPassword })
      clearMustChangePassword()
      navigate(rutaHomePorRol(user?.rol), { replace: true })
    } catch (err: any) {
      const errores = err?.response?.data?.errors as string[] | undefined
      setError(errores?.[0] ?? err?.response?.data?.message ?? 'No se pudo cambiar la contraseña.')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-white">
      <div className="w-full max-w-[400px]">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center">
            <Building2 size={18} className="text-white" />
          </div>
          <div>
            <p className="font-bold text-slate-900 leading-none">Caja Menor</p>
            <p className="text-slate-500 text-xs">MiraxionTech</p>
          </div>
        </div>

        <div className="mb-6">
          <div className="w-11 h-11 rounded-xl bg-indigo-100 flex items-center justify-center mb-3">
            <KeyRound size={20} className="text-indigo-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            {forzado ? 'Crea tu contraseña' : 'Cambiar contraseña'}
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {forzado
              ? 'Por seguridad, define una contraseña personal antes de continuar. Tu contraseña actual es tu cédula.'
              : 'Actualiza tu contraseña por una nueva.'}
          </p>
        </div>

        <div className="mb-5 rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 flex gap-2.5 text-xs text-slate-500">
          <ShieldCheck size={15} className="text-indigo-500 shrink-0 mt-0.5" />
          <span>Debe tener mínimo 8 caracteres e incluir mayúscula, minúscula, número y un carácter especial (! @ # $ …).</span>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="passwordActual">{forzado ? 'Cédula (contraseña actual)' : 'Contraseña actual'}</Label>
            <div className="relative">
              <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                id="passwordActual"
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                error={!!errors.passwordActual}
                className="pl-10"
                {...register('passwordActual')}
              />
            </div>
            {errors.passwordActual && <p className="text-xs text-red-500">{errors.passwordActual.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="nuevaPassword">Nueva contraseña</Label>
            <div className="relative">
              <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                id="nuevaPassword"
                type={show ? 'text' : 'password'}
                placeholder="••••••••"
                autoComplete="new-password"
                error={!!errors.nuevaPassword}
                className="pl-10 pr-11"
                {...register('nuevaPassword')}
              />
              <button
                type="button"
                onClick={() => setShow(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1 rounded"
                tabIndex={-1}
              >
                {show ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {errors.nuevaPassword && <p className="text-xs text-red-500">{errors.nuevaPassword.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirmar">Confirmar contraseña</Label>
            <div className="relative">
              <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                id="confirmar"
                type={show ? 'text' : 'password'}
                placeholder="••••••••"
                autoComplete="new-password"
                error={!!errors.confirmar}
                className="pl-10"
                {...register('confirmar')}
              />
            </div>
            {errors.confirmar && <p className="text-xs text-red-500">{errors.confirmar.message}</p>}
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full h-11 text-sm" loading={isSubmitting}>
            Guardar contraseña
          </Button>
        </form>
      </div>
    </div>
  )
}
