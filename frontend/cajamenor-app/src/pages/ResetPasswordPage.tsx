import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { resetPassword } from '@/api/auth'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'

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
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-teal-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-teal-800">Caja Menor</h1>
          <p className="text-gray-500 mt-1">Nueva contraseña</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Restablecer contraseña</CardTitle>
          </CardHeader>
          <CardContent>
            {enlaceInvalido ? (
              <div className="space-y-4">
                <div className="rounded-md bg-red-50 border border-red-200 px-3 py-3 text-sm text-red-700">
                  El enlace no es válido o está incompleto. Solicita uno nuevo.
                </div>
                <Link to="/forgot-password">
                  <Button variant="outline" className="w-full">Solicitar nuevo enlace</Button>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <p className="text-sm text-gray-500">
                  Restableciendo la contraseña de <b>{email}</b>.
                </p>
                <div className="space-y-1">
                  <Label htmlFor="nuevaPassword">Nueva contraseña</Label>
                  <Input
                    id="nuevaPassword"
                    type="password"
                    placeholder="••••••••"
                    autoComplete="new-password"
                    {...register('nuevaPassword')}
                  />
                  {errors.nuevaPassword && (
                    <p className="text-xs text-red-500">{errors.nuevaPassword.message}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label htmlFor="confirmar">Confirmar contraseña</Label>
                  <Input
                    id="confirmar"
                    type="password"
                    placeholder="••••••••"
                    autoComplete="new-password"
                    {...register('confirmar')}
                  />
                  {errors.confirmar && (
                    <p className="text-xs text-red-500">{errors.confirmar.message}</p>
                  )}
                </div>

                {error && (
                  <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <Button type="submit" className="w-full" loading={isSubmitting}>
                  Guardar contraseña
                </Button>

                <div className="text-center">
                  <Link to="/login" className="text-sm text-teal-700 hover:underline">
                    Volver a iniciar sesión
                  </Link>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
