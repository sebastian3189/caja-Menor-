import { useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ClipboardList,
  Pen,
  Trash2,
  Download,
  Plus,
  CheckCircle2,
  Clock,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import {
  getArqueo,
  generarArqueo,
  subirFirmaDirectivo,
  subirFirmaAdministrador,
  eliminarFirmaDirectivo,
  eliminarFirmaAdministrador,
  descargarPdf,
} from '@/api/arqueo'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { StatCard } from '@/components/ui/StatCard'
import { PageHeader } from '@/components/ui/PageHeader'
import { formatCurrency, formatDate } from '@/lib/utils'

function FirmaSlot({
  label,
  firmada,
  canEdit,
  onUpload,
  onDelete,
  isUploading,
  isDeleting,
}: {
  label: string
  firmada: boolean
  canEdit: boolean
  onUpload: (file: File) => void
  onDelete: () => void
  isUploading: boolean
  isDeleting: boolean
}) {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <div className={`p-4 rounded-xl border-2 transition-all ${firmada ? 'border-emerald-200 bg-emerald-50' : 'border-dashed border-slate-200 bg-slate-50'}`}>
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${firmada ? 'bg-emerald-100' : 'bg-slate-100'}`}>
          {firmada ? (
            <CheckCircle2 size={18} className="text-emerald-600" />
          ) : (
            <Clock size={18} className="text-slate-400" />
          )}
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">{label}</p>
          <p className={`text-xs ${firmada ? 'text-emerald-600' : 'text-slate-400'}`}>
            {firmada ? 'Firma registrada' : 'Pendiente de firma'}
          </p>
        </div>
        <div className="ml-auto">
          <Badge variant={firmada ? 'success' : 'secondary'}>
            {firmada ? 'Firmado' : 'Pendiente'}
          </Badge>
        </div>
      </div>

      {canEdit && (
        <div className="flex gap-2">
          {!firmada && (
            <>
              <input
                ref={ref}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) onUpload(file)
                }}
              />
              <Button
                variant="secondary"
                size="sm"
                loading={isUploading}
                onClick={() => ref.current?.click()}
                className="flex-1"
              >
                <Pen size={13} />
                Subir firma
              </Button>
            </>
          )}
          {firmada && (
            <Button
              variant="destructive"
              size="sm"
              loading={isDeleting}
              onClick={onDelete}
            >
              <Trash2 size={13} />
              Eliminar
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

export function ArqueoPage() {
  const { user } = useAuthStore()
  const cajaId = user?.cajaId!
  const queryClient = useQueryClient()
  const isDirector = user?.rol === 'Director'
  const isAdmin = user?.rol === 'Administrador'

  const { data: arqueo, isLoading } = useQuery({
    queryKey: ['arqueo', cajaId],
    queryFn: () => getArqueo(cajaId),
    refetchOnMount: 'always',
  })

  const generarMutation = useMutation({
    mutationFn: () => generarArqueo(cajaId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['arqueo', cajaId] }),
  })

  const firmaDirectivoMutation = useMutation({
    mutationFn: (file: File) => subirFirmaDirectivo(cajaId, file),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['arqueo', cajaId] }),
  })

  const firmaAdminMutation = useMutation({
    mutationFn: (file: File) => subirFirmaAdministrador(cajaId, file),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['arqueo', cajaId] }),
  })

  const eliminarFirmaDirectivoMutation = useMutation({
    mutationFn: () => eliminarFirmaDirectivo(cajaId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['arqueo', cajaId] }),
  })

  const eliminarFirmaAdminMutation = useMutation({
    mutationFn: () => eliminarFirmaAdministrador(cajaId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['arqueo', cajaId] }),
  })

  const handleDescargarPdf = async () => {
    const blob = await descargarPdf(cajaId)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `arqueo-caja-${cajaId}.pdf`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-slate-400">
          <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Cargando arqueo...</span>
        </div>
      </div>
    )
  }

  const ambas = arqueo?.tieneFirmaDirectivo && arqueo?.tieneFirmaAdministrador

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Arqueo de Caja"
        subtitle="Control y cierre del período de caja"
        icon={ClipboardList}
        iconColor="text-violet-600"
        iconBg="bg-violet-100"
        actions={
          <div className="flex flex-wrap gap-2">
            {!arqueo && (
              <Button loading={generarMutation.isPending} onClick={() => generarMutation.mutate()}>
                <Plus size={15} />
                Generar arqueo
              </Button>
            )}
          </div>
        }
      />

      {!arqueo ? (
        <Card>
          <CardContent className="py-20 text-center">
            <ClipboardList size={48} className="text-slate-200 mx-auto mb-4" />
            <p className="text-slate-500 font-medium mb-1">No hay arqueo generado</p>
            <p className="text-sm text-slate-400 mb-5">
              Genera el documento de arqueo para registrar el resumen de movimientos.
            </p>
            <Button loading={generarMutation.isPending} onClick={() => generarMutation.mutate()}>
              <Plus size={15} />
              Generar arqueo ahora
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Header info */}
          <Card accent="violet">
            <CardHeader>
              <div className="flex flex-wrap items-center gap-2 justify-between">
                <CardTitle className="truncate">Arqueo — {arqueo.nombreCaja}</CardTitle>
                <Badge
                  variant={
                    arqueo.estado === 'EnviadoTesoreria' ? 'success' :
                    arqueo.estado === 'Cerrado' ? 'secondary' : 'default'
                  }
                >
                  {arqueo.estado}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                <div className="p-3 bg-slate-50 rounded-xl">
                  <p className="text-xs text-slate-500 mb-1">Fecha arqueo</p>
                  <p className="text-sm font-semibold text-slate-900">{formatDate(arqueo.fechaArqueo)}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <p className="text-xs text-slate-500 mb-1">Valor apertura</p>
                  <p className="text-sm font-bold text-slate-900">{formatCurrency(arqueo.valorApertura)}</p>
                </div>
                <div className="p-3 bg-emerald-50 rounded-xl">
                  <p className="text-xs text-emerald-600 mb-1">Disponible</p>
                  <p className="text-sm font-bold text-emerald-700">{formatCurrency(arqueo.disponibleCaja)}</p>
                </div>
                <div className="p-3 bg-amber-50 rounded-xl">
                  <p className="text-xs text-amber-600 mb-1">Total reembolso</p>
                  <p className="text-sm font-bold text-amber-700">{formatCurrency(arqueo.totalReembolso)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Resumen movimientos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            <StatCard
              label="Avances pendientes legalizar"
              value={arqueo.resumenMovimientos.avancesPendientesLegalizar}
              icon={ClipboardList}
              iconColor="text-amber-600"
              iconBg="bg-amber-100"
              trend={{ value: formatCurrency(arqueo.resumenMovimientos.valorAvancesPendientesLegalizar), positive: false }}
            />
            <StatCard
              label="Avances pend. reembolso"
              value={arqueo.resumenMovimientos.avancesPendientesReembolso}
              icon={ClipboardList}
              iconColor="text-blue-600"
              iconBg="bg-blue-100"
              trend={{ value: formatCurrency(arqueo.resumenMovimientos.valorAvancesPendientesReembolso), positive: false }}
            />
            <StatCard
              label="Legalizaciones con avance"
              value={arqueo.resumenMovimientos.legalizacionesConAvance}
              icon={ClipboardList}
              iconColor="text-indigo-600"
              iconBg="bg-indigo-100"
              trend={{ value: formatCurrency(arqueo.resumenMovimientos.valorLegalizacionesConAvance), positive: true }}
            />
            <StatCard
              label="Legalizaciones sin avance"
              value={arqueo.resumenMovimientos.legalizacionesSinAvance}
              icon={ClipboardList}
              iconColor="text-violet-600"
              iconBg="bg-violet-100"
              trend={{ value: formatCurrency(arqueo.resumenMovimientos.valorLegalizacionesSinAvance), positive: true }}
            />
            <StatCard
              label="Reembolsos sin reembolsar"
              value={arqueo.resumenMovimientos.reembolsosSinReembolsar}
              icon={ClipboardList}
              iconColor="text-rose-600"
              iconBg="bg-rose-100"
              trend={{ value: formatCurrency(arqueo.resumenMovimientos.valorReembolsosSinReembolsar), positive: false }}
            />
          </div>

          {/* Firmas */}
          <Card accent="violet">
            <CardHeader>
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-violet-600" />
                <CardTitle>Firmas y descarga arqueo</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FirmaSlot
                  label="Firma Directivo"
                  firmada={arqueo.tieneFirmaDirectivo}
                  canEdit={isDirector}
                  onUpload={(f) => firmaDirectivoMutation.mutate(f)}
                  onDelete={() => eliminarFirmaDirectivoMutation.mutate()}
                  isUploading={firmaDirectivoMutation.isPending}
                  isDeleting={eliminarFirmaDirectivoMutation.isPending}
                />
                <FirmaSlot
                  label="Firma Administrador"
                  firmada={arqueo.tieneFirmaAdministrador}
                  canEdit={isAdmin}
                  onUpload={(f) => firmaAdminMutation.mutate(f)}
                  onDelete={() => eliminarFirmaAdminMutation.mutate()}
                  isUploading={firmaAdminMutation.isPending}
                  isDeleting={eliminarFirmaAdminMutation.isPending}
                />
              </div>

              {/* Descarga del arqueo */}
              <div className="pt-2">
                {!arqueo.fechaEnvioTesoreria ? (
                  ambas ? (
                    <Button
                      variant="outline"
                      onClick={handleDescargarPdf}
                      className="w-full h-11"
                    >
                      <Download size={16} />
                      Descargar PDF del arqueo
                    </Button>
                  ) : (
                    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-700">
                      <AlertTriangle size={16} className="shrink-0" />
                      <span>Se requieren ambas firmas para descargar el arqueo.</span>
                    </div>
                  )
                ) : (
                  <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={18} className="text-emerald-600" />
                      <span className="text-sm font-semibold text-emerald-700">Enviado a Tesorería</span>
                    </div>
                    <span className="text-xs text-emerald-600">{formatDate(arqueo.fechaEnvioTesoreria)}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
