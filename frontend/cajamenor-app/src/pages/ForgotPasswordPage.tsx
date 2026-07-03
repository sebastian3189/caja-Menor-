import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { forgotPassword } from '@/api/auth'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'

const forgotSchema = z.object({
  email: z.string().email('Email inválido'),
})

type ForgotForm = z.infer<typeof forgotSchema>

export function ForgotPasswordPage() {
  const [enviado, setEnviado] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotForm>({ resolver: zodResolver(forgotSchema) })

  const onSubmit = async (data: ForgotForm) => {
    try {
      await forgotPassword(data)
    } catch {
      // Respuesta genérica igualmente: no revelamos si el correo existe
    }
    setEnviado(true)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-teal-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-teal-800">Caja Menor</h1>
          <p className="text-gray-500 mt-1">Recuperación de contraseña</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>¿Olvidaste tu contraseña?</CardTitle>
          </CardHeader>
          <CardContent>
            {enviado ? (
              <div className="space-y-4">
                <div className="rounded-md bg-teal-50 border border-teal-200 px-3 py-3 text-sm text-teal-800">
                  Si el correo está registrado, te enviamos un enlace para restablecer tu contraseña.
                  Revisa tu bandeja de entrada (y la carpeta de spam).
                </div>
                <Link to="/login">
                  <Button variant="outline" className="w-full">Volver a iniciar sesión</Button>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <p className="text-sm text-gray-500">
                  Ingresa tu correo y te enviaremos un enlace para crear una nueva contraseña.
                </p>
                <div className="space-y-1">
                  <Label htmlFor="email">Correo electrónico</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="usuario@miraxiontech.com"
                    autoComplete="email"
                    {...register('email')}
                  />
                  {errors.email && (
                    <p className="text-xs text-red-500">{errors.email.message}</p>
                  )}
                </div>

                <Button type="submit" className="w-full" loading={isSubmitting}>
                  Enviar enlace
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
