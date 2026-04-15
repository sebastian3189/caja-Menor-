import { useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import {
  getArqueo,
  generarArqueo,
  subirFirmaDirectivo,
  subirFirmaAdministrador,
  eliminarFirmaDirectivo,
  eliminarFirmaAdministrador,
  enviarTesoreria,
  descargarPdf,
} from '@/api/arqueo'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { formatCurrency, formatDate } from '@/lib/utils'

function FirmaStatus({ tiene, label }: { tiene: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`w-2.5 h-2.5 rounded-full ${tiene ? 'bg-green-500' : 'bg-gray-300'}`} />
      <span className="text-sm text-gray-700">{label}</span>
      {tiene ? (
        <Badge variant="success" className="text-xs">Firmado</Badge>
      ) : (
        <Badge variant="secondary" className="text-xs">Pendiente</Badge>
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
  const firmaDirectivoRef = useRef<HTMLInputElement>(null)
  const firmaAdminRef = useRef<HTMLInputElement>(null)

  const { data: arqueo, isLoading } = useQuery({
    queryKey: ['arqueo', cajaId],
    queryFn: () => getArqueo(cajaId),
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

  const enviarMutation = useMutation({
    mutationFn: () => enviarTesoreria(cajaId),
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
        <p className="text-gray-500">Cargando arqueo...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Arqueo de Caja</h2>
          <p className="text-sm text-gray-500 mt-0.5">Control y cierre del período</p>
        </div>
        <div className="flex gap-3">
          {!arqueo && (
            <Button
              loading={generarMutation.isPending}
              onClick={() => generarMutation.mutate()}
            >
              Generar arqueo
            </Button>
          )}
          {arqueo && (
            <Button variant="outline" onClick={handleDescargarPdf}>
              Descargar PDF
            </Button>
          )}
        </div>
      </div>

      {!arqueo ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500 mb-4">No hay arqueo generado para esta caja.</p>
            <p className="text-sm text-gray-400">Haz clic en "Generar arqueo" para crear el documento de cierre.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Header info */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Arqueo — {arqueo.nombreCaja}</CardTitle>
                <Badge variant={arqueo.estado === 'EnviadoTesoreria' ? 'success' : arqueo.estado === 'Cerrado' ? 'secondary' : 'default'}>
                  {arqueo.estado}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <dt className="text-xs text-gray-500">Fecha arqueo</dt>
                  <dd className="text-sm font-medium mt-0.5">{formatDate(arqueo.fechaArqueo)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500">Valor apertura</dt>
                  <dd className="text-sm font-medium mt-0.5">{formatCurrency(arqueo.valorApertura)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500">Disponible caja</dt>
                  <dd className="text-sm font-medium mt-0.5 text-teal-600">{formatCurrency(arqueo.disponibleCaja)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500">Total reembolso</dt>
                  <dd className="text-sm font-medium mt-0.5 text-orange-600">{formatCurrency(arqueo.totalReembolso)}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* Resumen movimientos */}
          <Card>
            <CardHeader>
              <CardTitle>Resumen de movimientos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left">
                      <th className="pb-3 pr-4 font-medium text-gray-500">Concepto</th>
                      <th className="pb-3 pr-4 font-medium text-gray-500 text-right">Cantidad</th>
                      <th className="pb-3 font-medium text-gray-500 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    <tr>
                      <td className="py-2.5 pr-4 text-gray-700">Avances pendientes de legalizar</td>
                      <td className="py-2.5 pr-4 text-right">{arqueo.resumenMovimientos.avancesPendientesLegalizar}</td>
                      <td className="py-2.5 text-right">{formatCurrency(arqueo.resumenMovimientos.valorAvancesPendientesLegalizar)}</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 pr-4 text-gray-700">Avances pendientes de reembolso</td>
                      <td className="py-2.5 pr-4 text-right">{arqueo.resumenMovimientos.avancesPendientesReembolso}</td>
                      <td className="py-2.5 text-right">{formatCurrency(arqueo.resumenMovimientos.valorAvancesPendientesReembolso)}</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 pr-4 text-gray-700">Legalizaciones con avance</td>
                      <td className="py-2.5 pr-4 text-right">{arqueo.resumenMovimientos.legalizacionesConAvance}</td>
                      <td className="py-2.5 text-right">{formatCurrency(arqueo.resumenMovimientos.valorLegalizacionesConAvance)}</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 pr-4 text-gray-700">Legalizaciones sin avance</td>
                      <td className="py-2.5 pr-4 text-right">{arqueo.resumenMovimientos.legalizacionesSinAvance}</td>
                      <td className="py-2.5 text-right">{formatCurrency(arqueo.resumenMovimientos.valorLegalizacionesSinAvance)}</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 pr-4 text-gray-700">Reembolsos sin reembolsar</td>
                      <td className="py-2.5 pr-4 text-right">{arqueo.resumenMovimientos.reembolsosSinReembolsar}</td>
                      <td className="py-2.5 text-right font-semibold text-teal-700">{formatCurrency(arqueo.resumenMovimientos.valorReembolsosSinReembolsar)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Firmas y envío */}
          <Card>
            <CardHeader>
              <CardTitle>Firmas y envío a Tesorería</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-8">
                <FirmaStatus tiene={arqueo.tieneFirmaDirectivo} label="Firma Directivo" />
                <FirmaStatus tiene={arqueo.tieneFirmaAdministrador} label="Firma Administrador" />
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                {/* Firma directivo */}
                {isDirector && !arqueo.tieneFirmaDirectivo && (
                  <>
                    <input
                      ref={firmaDirectivoRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) firmaDirectivoMutation.mutate(file)
                      }}
                    />
                    <Button
                      variant="outline"
                      loading={firmaDirectivoMutation.isPending}
                      onClick={() => firmaDirectivoRef.current?.click()}
                    >
                      Subir firma directivo
                    </Button>
                  </>
                )}
                {isDirector && arqueo.tieneFirmaDirectivo && (
                  <Button
                    variant="destructive"
                    size="sm"
                    loading={eliminarFirmaDirectivoMutation.isPending}
                    onClick={() => eliminarFirmaDirectivoMutation.mutate()}
                  >
                    Eliminar firma directivo
                  </Button>
                )}

                {/* Firma administrador */}
                {isAdmin && !arqueo.tieneFirmaAdministrador && (
                  <>
                    <input
                      ref={firmaAdminRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) firmaAdminMutation.mutate(file)
                      }}
                    />
                    <Button
                      variant="outline"
                      loading={firmaAdminMutation.isPending}
                      onClick={() => firmaAdminRef.current?.click()}
                    >
                      Subir firma administrador
                    </Button>
                  </>
                )}
                {isAdmin && arqueo.tieneFirmaAdministrador && (
                  <Button
                    variant="destructive"
                    size="sm"
                    loading={eliminarFirmaAdminMutation.isPending}
                    onClick={() => eliminarFirmaAdminMutation.mutate()}
                  >
                    Eliminar firma administrador
                  </Button>
                )}

                {/* Enviar a Tesorería — solo Administrador, requiere ambas firmas */}
                {isAdmin && arqueo.tieneFirmaDirectivo && arqueo.tieneFirmaAdministrador && !arqueo.fechaEnvioTesoreria && (
                  <Button
                    variant="success"
                    loading={enviarMutation.isPending}
                    onClick={() => enviarMutation.mutate()}
                  >
                    Enviar a Tesorería
                  </Button>
                )}

                {arqueo.fechaEnvioTesoreria && (
                  <div className="flex items-center gap-2">
                    <Badge variant="success">Enviado a Tesorería</Badge>
                    <span className="text-sm text-gray-500">{formatDate(arqueo.fechaEnvioTesoreria)}</span>
                  </div>
                )}
              </div>

              {isAdmin && (!arqueo.tieneFirmaDirectivo || !arqueo.tieneFirmaAdministrador) && (
                <p className="text-xs text-gray-500">
                  Se requieren ambas firmas para poder enviar el arqueo a Tesorería.
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
