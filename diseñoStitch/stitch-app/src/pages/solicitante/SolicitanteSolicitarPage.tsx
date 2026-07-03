import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { Send, DollarSign, FileText, CheckCircle2, Building2, ListChecks } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { crearSolicitud } from '@/api/solicitudes'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { PageHeader } from '@/components/ui/PageHeader'

const schema = z.object({
  valorSolicitado: z.string().min(1, 'Requerido').refine(v => !isNaN(Number(v)) && Number(v) > 0, 'Debe ser mayor a 0'),
  descripcion: z.string().min(1, 'Describa para qué es el avance'),
})
type Form = z.infer<typeof schema>

export function SolicitanteSolicitarPage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [exito, setExito] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<Form>({ resolver: zodResolver(schema) })

  const crearMutation = useMutation({
    mutationFn: (d: Form) => crearSolicitud({ valorSolicitado: Number(d.valorSolicitado), descripcion: d.descripcion }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mis-solicitudes'] })
      reset()
      setError(null)
      setExito(true)
    },
    onError: (e: any) => setError(e?.response?.data?.message ?? 'No se pudo enviar la solicitud.'),
  })

  if (!user?.cajaId) {
    return (
      <div className="space-y-6 animate-fade-in">
        <PageHeader title="Solicitar avance" subtitle="Envía una solicitud de avance al administrador" icon={Send} iconColor="text-teal-600" iconBg="bg-teal-100" />
        <Card>
          <CardContent className="py-10 text-center">
            <Building2 size={32} className="text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500">Aún no tienes una caja asignada. Contacta al usuario Maestro.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Solicitar avance"
        subtitle="Envía una solicitud de avance al administrador de tu caja"
        icon={Send}
        iconColor="text-teal-600"
        iconBg="bg-teal-100"
        actions={
          <Button variant="outline" onClick={() => navigate('/solicitante/mis-solicitudes')}>
            <ListChecks size={15} /> Mis solicitudes
          </Button>
        }
      />

      <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-teal-50 border border-teal-200 text-sm">
        <Building2 size={15} className="text-teal-600" />
        <span className="text-teal-700">Caja: <b>{user.nombreCaja}</b></span>
      </div>

      {exito && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200">
          <CheckCircle2 size={18} className="text-emerald-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-emerald-700">Solicitud enviada</p>
            <p className="text-xs text-emerald-600">El administrador recibirá una notificación para aceptarla o rechazarla. Puedes seguir su estado en “Mis solicitudes”.</p>
          </div>
        </div>
      )}

      <Card accent="teal">
        <CardHeader><CardTitle>Nueva solicitud</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit((d) => { setExito(false); crearMutation.mutate(d) })} className="space-y-4 max-w-lg">
            <div className="space-y-1.5">
              <Label>Valor solicitado</Label>
              <div className="relative">
                <DollarSign size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input type="number" step="0.01" placeholder="0" className="pl-9" {...register('valorSolicitado')} error={!!errors.valorSolicitado} />
              </div>
              {errors.valorSolicitado && <p className="text-xs text-red-500">{errors.valorSolicitado.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Descripción / concepto</Label>
              <div className="relative">
                <FileText size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input placeholder="¿Para qué necesitas el avance?" className="pl-9" {...register('descripcion')} error={!!errors.descripcion} />
              </div>
              {errors.descripcion && <p className="text-xs text-red-500">{errors.descripcion.message}</p>}
            </div>

            {error && <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}

            <Button type="submit" loading={isSubmitting || crearMutation.isPending}>
              <Send size={15} /> Enviar solicitud
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
