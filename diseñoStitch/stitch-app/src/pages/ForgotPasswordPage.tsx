import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Mail, ArrowLeft, Building2, CheckCircle2 } from 'lucide-react'
import { forgotPassword } from '@/api/auth'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'

const forgotSchema = z.object({
  email: z.string().email('Correo electrónico inválido'),
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

        {enviado ? (
          <div className="space-y-6">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 size={24} className="text-emerald-600" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900">Revisa tu correo</h1>
              <p className="text-slate-500 text-sm">
                Si el correo está registrado, te enviamos un enlace para restablecer tu contraseña.
                Revisa tu bandeja de entrada y la carpeta de spam.
              </p>
            </div>
            <Link to="/login">
              <Button variant="outline" className="w-full h-11 text-sm">
                <ArrowLeft size={16} /> Volver a iniciar sesión
              </Button>
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-slate-900">¿Olvidaste tu contraseña?</h1>
              <p className="text-slate-500 text-sm mt-1">
                Ingresa tu correo y te enviaremos un enlace para crear una nueva.
              </p>
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
                {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
              </div>

              <Button type="submit" className="w-full h-11 text-sm" loading={isSubmitting}>
                Enviar enlace
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
