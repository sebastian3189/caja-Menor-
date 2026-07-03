import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Archive, Plus, Pencil, Trash2, Search, X, Lock, LockOpen, Wallet } from 'lucide-react'
import { listarCajas, crearCaja, editarCaja, eliminarCaja, cerrarCaja, reabrirCaja } from '@/api/cajaMenor'
import { listarCentrales } from '@/api/centrales'
import { listarUsuarios } from '@/api/auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Select } from '@/components/ui/Select'
import { StatCard } from '@/components/ui/StatCard'
import { Pagination } from '@/components/ui/Pagination'
import { Modal } from '@/components/ui/Modal'
import { PageHeader } from '@/components/ui/PageHeader'
import { formatCurrency } from '@/lib/utils'
import type { CajaMenorDto } from '@/types'

const crearSchema = z.object({
  nombre: z.string().min(1, 'Requerido'),
  centralId: z.string().min(1, 'Requerido'),
  valorApertura: z.string().min(1, 'Requerido').refine(v => !isNaN(Number(v)) && Number(v) > 0, 'Debe ser mayor a 0'),
  directorId: z.string().min(1, 'Requerido'),
  administradorId: z.string().optional(),
})
type CrearForm = z.infer<typeof crearSchema>

const editarSchema = z.object({
  nombre: z.string().min(1, 'Requerido'),
  centralId: z.string().min(1, 'Requerido'),
  valorApertura: z.string().min(1, 'Requerido').refine(v => !isNaN(Number(v)) && Number(v) > 0, 'Debe ser mayor a 0'),
  // Vacío = sin director/administrador asignado (queda disponible para asignar uno nuevo más adelante)
  directorId: z.string().optional(),
  administradorId: z.string().optional(),
})
type EditarForm = z.infer<typeof editarSchema>

export function MaestroCajasPage() {
  const queryClient = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<CajaMenorDto | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [error, setError] = useState<string | null>(null)

  const { data: cajas = [], isLoading } = useQuery({ queryKey: ['maestro-cajas'], queryFn: listarCajas })
  const { data: centrales = [] } = useQuery({ queryKey: ['maestro-centrales'], queryFn: listarCentrales })
  const { data: usuarios = [] } = useQuery({ queryKey: ['maestro-usuarios'], queryFn: listarUsuarios })
  const directores = usuarios.filter(u => u.rol === 'Director')
  const administradores = usuarios.filter(u => u.rol === 'Administrador')

  const invalidar = () => {
    queryClient.invalidateQueries({ queryKey: ['maestro-cajas'] })
    queryClient.invalidateQueries({ queryKey: ['maestro-centrales'] })
  }

  const crearMutation = useMutation({
    mutationFn: (d: CrearForm) => crearCaja({
      nombre: d.nombre,
      centralId: Number(d.centralId),
      valorApertura: Number(d.valorApertura),
      directorId: Number(d.directorId),
      administradorId: d.administradorId ? Number(d.administradorId) : 0,
    }),
    onSuccess: () => { invalidar(); setShowModal(false); resetCrear(); setError(null) },
    onError: (e: any) => setError(e?.response?.data?.message ?? 'Error al crear la caja.'),
  })

  const editarMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: EditarForm }) =>
      editarCaja(id, {
        nombre: data.nombre,
        centralId: Number(data.centralId),
        valorApertura: Number(data.valorApertura),
        directorId: data.directorId ? Number(data.directorId) : 0,
        administradorId: data.administradorId ? Number(data.administradorId) : 0,
      }),
    onSuccess: () => { invalidar(); setEditing(null); resetEditar(); setError(null) },
    onError: (e: any) => setError(e?.response?.data?.message ?? 'Error al editar la caja.'),
  })

  const eliminarMutation = useMutation({
    mutationFn: eliminarCaja,
    onSuccess: invalidar,
  })

  const cerrarMutation = useMutation({ mutationFn: cerrarCaja, onSuccess: invalidar, onError: (e: any) => alert(e?.response?.data?.message ?? 'Error al cerrar la caja.') })
  const reabrirMutation = useMutation({ mutationFn: reabrirCaja, onSuccess: invalidar })

  const {
    register: registerCrear, handleSubmit: handleSubmitCrear, reset: resetCrear, watch: watchCrear,
    formState: { errors: errorsCrear, isSubmitting: isSubmittingCrear },
  } = useForm<CrearForm>({ resolver: zodResolver(crearSchema) })

  const {
    register: registerEditar, handleSubmit: handleSubmitEditar, reset: resetEditar, watch: watchEditar,
    formState: { errors: errorsEditar, isSubmitting: isSubmittingEditar },
  } = useForm<EditarForm>({ resolver: zodResolver(editarSchema) })

  const abrirEditar = (c: CajaMenorDto) => {
    setEditing(c)
    resetEditar({
      nombre: c.nombre,
      centralId: String(c.centralId),
      valorApertura: String(c.valorApertura),
      directorId: c.directorId ? String(c.directorId) : '',
      administradorId: c.administradorIds[0] ? String(c.administradorIds[0]) : '',
    })
    setError(null)
  }

  // Un Director/Administrador solo puede estar en una caja: si el elegido ya está en otra, avisamos que quedará sin ella
  const directorIdCrear = watchCrear('directorId')
  const cajaConflictoCrear = directorIdCrear ? cajas.find(c => c.directorId === Number(directorIdCrear)) : undefined
  const administradorIdCrear = watchCrear('administradorId')
  const cajaConflictoAdminCrear = administradorIdCrear
    ? cajas.find(c => c.administradorIds.includes(Number(administradorIdCrear)))
    : undefined

  const directorIdEditar = watchEditar('directorId')
  const cajaConflictoEditar = editing && directorIdEditar
    ? cajas.find(c => c.directorId === Number(directorIdEditar) && c.id !== editing.id)
    : undefined
  const administradorIdEditar = watchEditar('administradorId')
  const cajaConflictoAdminEditar = editing && administradorIdEditar
    ? cajas.find(c => c.administradorIds.includes(Number(administradorIdEditar)) && c.id !== editing.id)
    : undefined

  const filtradas = cajas.filter(c => {
    if (!busqueda) return true
    const q = busqueda.toLowerCase()
    return c.nombre.toLowerCase().includes(q) || c.nombreCentral.toLowerCase().includes(q) || c.nombreDirector.toLowerCase().includes(q)
  })
  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / pageSize))
  const paginaActual = Math.min(page, totalPaginas)
  const cajasPagina = filtradas.slice((paginaActual - 1) * pageSize, paginaActual * pageSize)

  const abiertas = cajas.filter(c => c.estado === 'Abierta').length
  const totalDisponible = cajas.reduce((s, c) => s + c.disponible, 0)

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Cajas Menores"
        subtitle="Estructura, apertura y estado de todas las cajas del sistema"
        icon={Archive}
        iconColor="text-amber-600"
        iconBg="bg-amber-100"
        actions={
          <Button onClick={() => { setShowModal(true); resetCrear({ nombre: '', centralId: '', valorApertura: '', directorId: '', administradorId: '' }); setError(null) }}>
            <Plus size={15} /> Nueva caja
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total cajas" value={cajas.length} icon={Archive} iconColor="text-slate-600" iconBg="bg-slate-100" />
        <StatCard label="Abiertas" value={abiertas} icon={LockOpen} iconColor="text-emerald-600" iconBg="bg-emerald-100" />
        <StatCard label="Disponible total" value={formatCurrency(totalDisponible)} icon={Wallet} iconColor="text-teal-600" iconBg="bg-teal-100" />
      </div>

      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={busqueda}
          onChange={e => { setBusqueda(e.target.value); setPage(1) }}
          placeholder="Buscar por nombre, central o director..."
          className="w-full pl-9 pr-9 py-2.5 text-sm border border-slate-200 rounded-xl bg-white text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
        />
        {busqueda && (
          <button onClick={() => setBusqueda('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" aria-label="Limpiar">
            <X size={15} />
          </button>
        )}
      </div>

      <Card accent="amber">
        <CardHeader><CardTitle>Listado de cajas</CardTitle></CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-16 flex items-center justify-center gap-3 text-slate-400">
              <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">Cargando cajas...</span>
            </div>
          ) : filtradas.length === 0 ? (
            <div className="py-16 text-center">
              <Archive size={32} className="text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-400">{cajas.length === 0 ? 'No hay cajas registradas' : 'Ninguna caja coincide con la búsqueda'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="stitch-table">
                <thead>
                  <tr>
                    <th></th>
                    <th>Nombre</th>
                    <th>Central</th>
                    <th>Director</th>
                    <th>Administradores</th>
                    <th>Apertura</th>
                    <th>Disponible</th>
                    <th>Estado</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {cajasPagina.map(c => (
                    <tr key={c.id}>
                      <td>
                        <button
                          onClick={() => abrirEditar(c)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                          title="Editar caja"
                        >
                          <Pencil size={13} />
                        </button>
                      </td>
                      <td className="font-medium text-slate-900">{c.nombre}</td>
                      <td className="text-sm text-slate-600">{c.nombreCentral}</td>
                      <td className="text-sm text-slate-600">{c.nombreDirector || <span className="text-slate-300 italic">Sin asignar</span>}</td>
                      <td className="text-sm text-slate-600">{c.nombreAdministrador || <span className="text-slate-300 italic">Ninguno</span>}</td>
                      <td className="text-sm">{formatCurrency(c.valorApertura)}</td>
                      <td className="font-semibold text-emerald-700">{formatCurrency(c.disponible)}</td>
                      <td><Badge variant={c.estado === 'Abierta' ? 'success' : 'secondary'}>{c.estado}</Badge></td>
                      <td>
                        <div className="flex items-center gap-1">
                          {c.estado === 'Abierta' ? (
                            <button
                              onClick={() => { if (confirm(`¿Cerrar la caja ${c.nombre}?`)) cerrarMutation.mutate(c.id) }}
                              disabled={cerrarMutation.isPending && cerrarMutation.variables === c.id}
                              className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-40"
                              title="Cerrar caja"
                            >
                              <Lock size={13} />
                            </button>
                          ) : (
                            <button
                              onClick={() => reabrirMutation.mutate(c.id)}
                              disabled={reabrirMutation.isPending && reabrirMutation.variables === c.id}
                              className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 disabled:opacity-40"
                              title="Reabrir caja"
                            >
                              <LockOpen size={13} />
                            </button>
                          )}
                          <button
                            onClick={() => { if (confirm(`¿Eliminar la caja ${c.nombre}? Esta acción no se puede deshacer.`)) eliminarMutation.mutate(c.id) }}
                            disabled={!c.puedeEliminar || (eliminarMutation.isPending && eliminarMutation.variables === c.id)}
                            title={c.puedeEliminar ? 'Eliminar caja' : 'No se puede eliminar: tiene movimientos registrados'}
                            className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors text-slate-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-slate-400 disabled:hover:bg-transparent"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {filtradas.length > 0 && (
            <Pagination page={paginaActual} pageSize={pageSize} totalItems={filtradas.length} onPageChange={setPage} onPageSizeChange={setPageSize} />
          )}
        </CardContent>
      </Card>

      {/* Modal crear */}
      <Modal open={showModal} onClose={() => { setShowModal(false); resetCrear(); setError(null) }} title="Nueva Caja Menor" size="lg">
        <form
          onSubmit={handleSubmitCrear((d) => {
            const advertencias: string[] = []
            if (cajaConflictoCrear) advertencias.push(`${cajaConflictoCrear.nombreDirector} quedará sin caja asignada (dirigía ${cajaConflictoCrear.nombre})`)
            if (cajaConflictoAdminCrear) advertencias.push(`El administrador elegido quedará sin caja asignada (administraba ${cajaConflictoAdminCrear.nombre})`)
            if (advertencias.length > 0 && !confirm(`¿Estás seguro?\n\n${advertencias.join('\n')}`)) return
            crearMutation.mutate(d)
          })}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Nombre</Label>
              <Input placeholder="Caja Menor Central Norte" {...registerCrear('nombre')} error={!!errorsCrear.nombre} />
              {errorsCrear.nombre && <p className="text-xs text-red-500">{errorsCrear.nombre.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Central</Label>
              <Select {...registerCrear('centralId')}>
                <option value="">Seleccionar...</option>
                {centrales.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </Select>
              {errorsCrear.centralId && <p className="text-xs text-red-500">{errorsCrear.centralId.message}</p>}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Valor de apertura</Label>
            <Input type="number" step="0.01" placeholder="0" {...registerCrear('valorApertura')} error={!!errorsCrear.valorApertura} />
            {errorsCrear.valorApertura && <p className="text-xs text-red-500">{errorsCrear.valorApertura.message}</p>}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Director</Label>
              <Select {...registerCrear('directorId')}>
                <option value="">Seleccionar...</option>
                {directores.map(d => <option key={d.id} value={d.usuarioAppId}>{d.nombreCompleto}</option>)}
              </Select>
              {errorsCrear.directorId && <p className="text-xs text-red-500">{errorsCrear.directorId.message}</p>}
              {directores.length === 0 && <p className="text-xs text-amber-600">No hay usuarios con rol Director. Cree uno primero.</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Administrador (opcional)</Label>
              <Select {...registerCrear('administradorId')}>
                <option value="">Sin asignar</option>
                {administradores.map(a => <option key={a.id} value={a.usuarioAppId}>{a.nombreCompleto}</option>)}
              </Select>
            </div>
          </div>

          {cajaConflictoCrear && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
              ⚠ Este Director ya dirige <b>{cajaConflictoCrear.nombre}</b>; quedará sin caja asignada al crear esta nueva.
            </div>
          )}
          {cajaConflictoAdminCrear && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
              ⚠ Este Administrador ya administra <b>{cajaConflictoAdminCrear.nombre}</b>; quedará sin caja asignada al crear esta nueva.
            </div>
          )}

          {error && <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => { setShowModal(false); resetCrear(); setError(null) }}>Cancelar</Button>
            <Button type="submit" className="flex-1" loading={isSubmittingCrear || crearMutation.isPending}>Crear caja</Button>
          </div>
        </form>
      </Modal>

      {/* Modal editar */}
      <Modal open={!!editing} onClose={() => { setEditing(null); resetEditar(); setError(null) }} title={`Editar — ${editing?.nombre ?? ''}`} size="lg">
        {editing && (
          <form
            onSubmit={handleSubmitEditar((d) => {
              const advertencias: string[] = []
              if (cajaConflictoEditar) advertencias.push(`${cajaConflictoEditar.nombreDirector} quedará sin caja asignada (dirigía ${cajaConflictoEditar.nombre})`)
              if (cajaConflictoAdminEditar) advertencias.push(`El administrador elegido quedará sin caja asignada (administraba ${cajaConflictoAdminEditar.nombre})`)
              if (advertencias.length > 0 && !confirm(`¿Estás seguro?\n\n${advertencias.join('\n')}`)) return
              editarMutation.mutate({ id: editing.id, data: d })
            })}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Nombre</Label>
                <Input {...registerEditar('nombre')} error={!!errorsEditar.nombre} />
                {errorsEditar.nombre && <p className="text-xs text-red-500">{errorsEditar.nombre.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Central</Label>
                <Select {...registerEditar('centralId')}>
                  <option value="">Seleccionar...</option>
                  {centrales.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Valor de apertura</Label>
              <Input type="number" step="0.01" disabled={!editing.puedeEditarApertura} {...registerEditar('valorApertura')} error={!!errorsEditar.valorApertura} />
              {errorsEditar.valorApertura && <p className="text-xs text-red-500">{errorsEditar.valorApertura.message}</p>}
              {!editing.puedeEditarApertura && (
                <p className="text-xs text-amber-600">Bloqueado: la caja ya tiene movimientos registrados (Total usado ≠ 0).</p>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Director</Label>
                <Select {...registerEditar('directorId')}>
                  <option value="">Sin director asignado</option>
                  {directores.map(d => <option key={d.id} value={d.usuarioAppId}>{d.nombreCompleto}</option>)}
                </Select>
                {errorsEditar.directorId && <p className="text-xs text-red-500">{errorsEditar.directorId.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Administrador</Label>
                <Select {...registerEditar('administradorId')}>
                  <option value="">Sin administrador asignado</option>
                  {administradores.map(a => <option key={a.id} value={a.usuarioAppId}>{a.nombreCompleto}</option>)}
                </Select>
              </div>
            </div>

            {cajaConflictoEditar && (
              <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
                ⚠ Este Director ya dirige <b>{cajaConflictoEditar.nombre}</b>; quedará sin caja asignada al guardar aquí.
              </div>
            )}
            {cajaConflictoAdminEditar && (
              <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
                ⚠ Este Administrador ya administra <b>{cajaConflictoAdminEditar.nombre}</b>; quedará sin caja asignada al guardar aquí.
              </div>
            )}

            {error && <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => { setEditing(null); resetEditar(); setError(null) }}>Cancelar</Button>
              <Button type="submit" className="flex-1" loading={isSubmittingEditar || editarMutation.isPending}>Guardar cambios</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
