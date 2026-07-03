import { useState, Fragment } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ShieldCheck, Search, X, ChevronDown, ChevronRight, Plus, Pencil, Trash2 } from 'lucide-react'
import { getAuditoria } from '@/api/auditoria'
import { useAuthStore } from '@/store/authStore'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { PageHeader } from '@/components/ui/PageHeader'
import { Pagination } from '@/components/ui/Pagination'
import { formatDate } from '@/lib/utils'
import type { AuditoriaDto } from '@/types'

const accionMeta: Record<string, { variant: 'success' | 'info' | 'destructive'; icon: typeof Plus; label: string }> = {
  Crear: { variant: 'success', icon: Plus, label: 'Crear' },
  Editar: { variant: 'info', icon: Pencil, label: 'Editar' },
  Eliminar: { variant: 'destructive', icon: Trash2, label: 'Eliminar' },
}

const tablaLabel: Record<string, string> = {
  Avance: 'Avance',
  Legalizacion: 'Legalización',
  Reembolso: 'Reembolso',
  Arqueo: 'Arqueo',
  LegalizacionRecibo: 'Recibo',
  CajaMenorEntity: 'Caja menor',
}

function DetalleJson({ titulo, json }: { titulo: string; json?: string | null }) {
  if (!json || json === '{}') return null
  let parsed: Record<string, unknown>
  try { parsed = JSON.parse(json) } catch { return null }
  const entries = Object.entries(parsed)
  if (entries.length === 0) return null
  return (
    <div className="flex-1 min-w-[200px]">
      <p className="text-xs font-semibold text-slate-500 mb-1.5">{titulo}</p>
      <div className="space-y-1">
        {entries.map(([k, v]) => (
          <div key={k} className="flex gap-2 text-xs">
            <span className="text-slate-400 shrink-0">{k}:</span>
            <span className="text-slate-700 font-medium break-all">{String(v ?? '—')}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function AuditoriaPage() {
  const { user } = useAuthStore()
  const subtitle = user?.rol === 'Maestro'
    ? 'Registro de todas las operaciones del sistema'
    : 'Registro de las operaciones de tu caja'
  const [busqueda, setBusqueda] = useState('')
  const [expandido, setExpandido] = useState<number | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['auditoria'],
    queryFn: () => getAuditoria(300),
    refetchOnMount: 'always',
  })

  const filtrados = logs.filter((l: AuditoriaDto) => {
    if (!busqueda) return true
    const q = busqueda.toLowerCase()
    return l.usuario.toLowerCase().includes(q)
      || l.accion.toLowerCase().includes(q)
      || (tablaLabel[l.tabla] ?? l.tabla).toLowerCase().includes(q)
  })

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / pageSize))
  const paginaActual = Math.min(page, totalPaginas)
  const pagina = filtrados.slice((paginaActual - 1) * pageSize, paginaActual * pageSize)

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Auditoría"
        subtitle={subtitle}
        icon={ShieldCheck}
        iconColor="text-violet-600"
        iconBg="bg-violet-100"
      />

      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={busqueda}
          onChange={e => { setBusqueda(e.target.value); setPage(1) }}
          placeholder="Buscar por usuario, acción o módulo..."
          className="w-full pl-9 pr-9 py-2.5 text-sm border border-slate-200 rounded-xl bg-white text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
        />
        {busqueda && (
          <button onClick={() => setBusqueda('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" aria-label="Limpiar">
            <X size={15} />
          </button>
        )}
      </div>

      <Card accent="violet">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-16 flex items-center justify-center gap-3 text-slate-400">
              <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">Cargando auditoría...</span>
            </div>
          ) : filtrados.length === 0 ? (
            <div className="py-16 text-center">
              <ShieldCheck size={32} className="text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-400">
                {logs.length === 0 ? 'No hay registros de auditoría aún' : 'Ningún registro coincide con la búsqueda'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="stitch-table">
                <thead>
                  <tr>
                    <th></th>
                    <th>Fecha</th>
                    <th>Usuario</th>
                    <th>Acción</th>
                    <th>Módulo</th>
                    <th>Registro</th>
                  </tr>
                </thead>
                <tbody>
                  {pagina.map((l: AuditoriaDto) => {
                    const meta = accionMeta[l.accion] ?? { variant: 'info' as const, icon: Pencil, label: l.accion }
                    const Icon = meta.icon
                    const abierto = expandido === l.id
                    const tieneDetalle = (l.datosAnteriores && l.datosAnteriores !== '{}') || (l.datosNuevos && l.datosNuevos !== '{}')
                    return (
                      <Fragment key={l.id}>
                        <tr
                          className={tieneDetalle ? 'cursor-pointer' : ''}
                          onClick={() => tieneDetalle && setExpandido(abierto ? null : l.id)}
                        >
                          <td>
                            {tieneDetalle && (
                              abierto ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />
                            )}
                          </td>
                          <td className="text-xs text-slate-500 whitespace-nowrap">
                            {formatDate(l.fecha)}
                            <span className="text-slate-300 ml-1">{new Date(l.fecha).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</span>
                          </td>
                          <td className="font-medium text-slate-700">{l.usuario}</td>
                          <td>
                            <Badge variant={meta.variant}>
                              <Icon size={11} className="mr-1" />
                              {meta.label}
                            </Badge>
                          </td>
                          <td className="text-sm text-slate-600">{tablaLabel[l.tabla] ?? l.tabla}</td>
                          <td className="text-xs font-mono text-slate-400">#{l.registroId}</td>
                        </tr>
                        {abierto && tieneDetalle && (
                          <tr>
                            <td colSpan={6} className="bg-slate-50">
                              <div className="flex flex-wrap gap-6 px-4 py-3">
                                <DetalleJson titulo="Antes" json={l.datosAnteriores} />
                                <DetalleJson titulo="Después" json={l.datosNuevos} />
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
          {filtrados.length > 0 && (
            <Pagination
              page={paginaActual}
              pageSize={pageSize}
              totalItems={filtrados.length}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
