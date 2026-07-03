import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Lock, ArrowLeft, Building2, Eye, EyeOff } from 'lucide-react'
import { resetPassword } from '@/api/auth'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'

const resetSchema = z
  .object({
    nuevaPassword: z.string().min(8, 'Mínimo 8 caracteres'),
    confirmar: z.string().min(1, 'Requerido'),
  })
  .refine(d => d.nuevaPassword === d.confirmar, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmar'],
  })
type ResetForm = z.infer<typeof resetSchema>

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const email = params.get('email') ?? ''
  const token = params.get('token') ?? ''
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetForm>({ resolver: zodResolver(resetSchema) })

  const enlaceInvalido = !email || !token

  const onSubmit = async (data: ResetForm) => {
    setError(null)
    try {
      await resetPassword({ email, token, nuevaPassword: data.nuevaPassword })
      navigate('/login', { replace: true })
    } catch (err: any) {
      const errores = err?.response?.data?.errors as string[] | undefined
      setError(errores?.[0] ?? 'No se pudo restablecer la contraseña. El enlace es inválido o expiró.')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-white">
      <div className="w-full max-w-[380px]">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center">
            <Building2 size={18} className="text-white" />
          </div>
          <div>
            <p className="font-bold text-slate-900 leading-none">Caja Menor</p>
            <p className="text-slate-500 text-xs">MiraxionTech</p>
          </div>
        </div>

        {enlaceInvalido ? (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Enlace inválido</h1>
              <p className="text-slate-500 text-sm mt-1">
                El enlace no es válido o está incompleto. Solicita uno nuevo.
              </p>
            </div>
            <Link to="/forgot-password">
              <Button variant="outline" className="w-full h-11 text-sm">Solicitar nuevo enlace</Button>
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-slate-900">Nueva contraseña</h1>
              <p className="text-slate-500 text-sm mt-1">
                Restableciendo la contraseña de <b className="text-slate-700">{email}</b>.
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="nuevaPassword">Nueva contraseña</Label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="nuevaPassword"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    error={!!errors.nuevaPassword}
                    className="pl-10 pr-11"
                    {...register('nuevaPassword')}
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
                {errors.nuevaPassword && <p className="text-xs text-red-500">{errors.nuevaPassword.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirmar">Confirmar contraseña</Label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="confirmar"
                    type={showPassword ? 'text' : 'password'}
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

              <div className="text-center">
                <Link to="/login" className="text-xs text-indigo-600 hover:text-indigo-800 hover:underline inline-flex items-center gap-1">
                  <ArrowLeft size={13} /> Volver a iniciar sesión
                </Link>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
