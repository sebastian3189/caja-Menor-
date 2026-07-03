import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Users, Plus, Pencil, Trash2, Search, X, ArrowRightLeft, User as UserIcon } from 'lucide-react'
import { listarUsuarios, registrarUsuario, editarUsuario, eliminarUsuario, asignarCaja } from '@/api/auth'
import { listarCentrales } from '@/api/centrales'
import { listarCajas } from '@/api/cajaMenor'
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
import type { UsuarioListDto } from '@/types'

const crearSchema = z.object({
  nombreCompleto: z.string().min(1, 'Requerido'),
  email: z.string().email('Correo inválido'),
  // La cédula es la contraseña inicial (mín. 8 dígitos para cumplir la política de Identity)
  cedula: z.string().regex(/^\d{8,15}$/, 'Cédula inválida (8 a 15 dígitos)'),
  rol: z.enum(['Director', 'Administrador', 'Solicitante']),
  centralId: z.string().min(1, 'Requerido'),
  cajaId: z.string().optional(),
}).superRefine((d, ctx) => {
  // El rol Solicitante debe quedar asignado a una caja al crearlo
  if (d.rol === 'Solicitante' && !d.cajaId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['cajaId'], message: 'Seleccione una caja' })
  }
})
type CrearForm = z.infer<typeof crearSchema>

const editarSchema = z.object({
  nombreCompleto: z.string().min(1, 'Requerido'),
  email: z.string().email('Correo inválido'),
  rol: z.enum(['Director', 'Administrador', 'Solicitante']),
  centralId: z.string().min(1, 'Requerido'),
  nuevaPassword: z.string().optional().refine(v => !v || v.length >= 8, 'Mínimo 8 caracteres'),
})
type EditarForm = z.infer<typeof editarSchema>

const rolBadge = { Director: 'warning', Administrador: 'default', Maestro: 'violet', Solicitante: 'success' } as const

export function MaestroUsuariosPage() {
  const queryClient = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<UsuarioListDto | null>(null)
  const [asignando, setAsignando] = useState<UsuarioListDto | null>(null)
  const [cajaSeleccionada, setCajaSeleccionada] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [error, setError] = useState<string | null>(null)

  const { data: usuarios = [], isLoading } = useQuery({ queryKey: ['maestro-usuarios'], queryFn: listarUsuarios })
  const { data: centrales = [] } = useQuery({ queryKey: ['maestro-centrales'], queryFn: listarCentrales })
  // Cajas: se necesitan tanto para asignar como para crear un Solicitante
  const { data: cajas = [] } = useQuery({ queryKey: ['maestro-cajas'], queryFn: listarCajas, enabled: !!asignando || showModal })

  const crearMutation = useMutation({
    mutationFn: (d: CrearForm) => registrarUsuario({
      nombreCompleto: d.nombreCompleto,
      email: d.email,
      cedula: d.cedula,
      rol: d.rol,
      centralId: Number(d.centralId),
      cajaId: d.rol === 'Solicitante' && d.cajaId ? Number(d.cajaId) : undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maestro-usuarios'] })
      queryClient.invalidateQueries({ queryKey: ['maestro-centrales'] })
      setShowModal(false)
      resetCrear()
      setError(null)
    },
    onError: (e: any) => setError(e?.response?.data?.errors?.join(', ') ?? e?.response?.data?.message ?? 'Error al crear el usuario.'),
  })

  const editarMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: EditarForm }) =>
      editarUsuario(id, { ...data, centralId: Number(data.centralId), nuevaPassword: data.nuevaPassword || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maestro-usuarios'] })
      setEditing(null)
      resetEditar()
      setError(null)
    },
    onError: (e: any) => setError(e?.response?.data?.errors?.join(', ') ?? e?.response?.data?.message ?? 'Error al editar el usuario.'),
  })

  const eliminarMutation = useMutation({
    mutationFn: eliminarUsuario,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['maestro-usuarios'] }),
  })

  const asignarMutation = useMutation({
    mutationFn: ({ userId, cajaId }: { userId: string; cajaId: number }) => asignarCaja(userId, cajaId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maestro-usuarios'] })
      queryClient.invalidateQueries({ queryKey: ['maestro-cajas'] })
      setAsignando(null)
      setCajaSeleccionada('')
      setError(null)
    },
    onError: (e: any) => setError(e?.response?.data?.errors?.join(', ') ?? e?.response?.data?.message ?? 'Error al asignar la caja.'),
  })

  const {
    register: registerCrear,
    handleSubmit: handleSubmitCrear,
    reset: resetCrear,
    watch: watchCrear,
    formState: { errors: errorsCrear, isSubmitting: isSubmittingCrear },
  } = useForm<CrearForm>({ resolver: zodResolver(crearSchema) })

  const rolCrear = watchCrear('rol')
  const centralIdCrear = watchCrear('centralId')
  // Al crear un Solicitante, solo se ofrecen las cajas de la central seleccionada
  const cajasDeCentral = centralIdCrear ? cajas.filter(c => c.centralId === Number(centralIdCrear)) : []

  const {
    register: registerEditar,
    handleSubmit: handleSubmitEditar,
    reset: resetEditar,
    formState: { errors: errorsEditar, isSubmitting: isSubmittingEditar },
  } = useForm<EditarForm>({ resolver: zodResolver(editarSchema) })

  const abrirEditar = (u: UsuarioListDto) => {
    setEditing(u)
    resetEditar({ nombreCompleto: u.nombreCompleto, email: u.email, rol: u.rol as 'Director' | 'Administrador', centralId: String(u.centralId), nuevaPassword: '' })
    setError(null)
  }

  const usuariosFiltrados = usuarios.filter(u => {
    if (!busqueda) return true
    const q = busqueda.toLowerCase()
    return u.nombreCompleto.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.rol.toLowerCase().includes(q)
  })
  const totalPaginas = Math.max(1, Math.ceil(usuariosFiltrados.length / pageSize))
  const paginaActual = Math.min(page, totalPaginas)
  const usuariosPagina = usuariosFiltrados.slice((paginaActual - 1) * pageSize, paginaActual * pageSize)

  const totalDirectores = usuarios.filter(u => u.rol === 'Director').length
  const totalAdmins = usuarios.filter(u => u.rol === 'Administrador').length

  // Impacto de la asignación de caja: a quién se le quita y si cambia de central
  const cajaElegida = cajaSeleccionada ? cajas.find(c => c.id === Number(cajaSeleccionada)) : undefined
  const huboReemplazo = !!(
    asignando && cajaElegida && asignando.rol === 'Director' &&
    cajaElegida.directorId !== 0 && cajaElegida.directorId !== asignando.usuarioAppId
  )
  const cambiaCentral = !!(asignando && cajaElegida && cajaElegida.centralId !== asignando.centralId)

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Usuarios"
        subtitle="Directores y administradores del sistema"
        icon={Users}
        iconColor="text-indigo-600"
        iconBg="bg-indigo-100"
        actions={
          <Button onClick={() => { setShowModal(true); resetCrear({ nombreCompleto: '', email: '', cedula: '', rol: 'Administrador', centralId: '', cajaId: '' }); setError(null) }}>
            <Plus size={15} /> Nuevo usuario
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total usuarios" value={usuarios.length} icon={Users} iconColor="text-slate-600" iconBg="bg-slate-100" />
        <StatCard label="Directores" value={totalDirectores} icon={UserIcon} iconColor="text-amber-600" iconBg="bg-amber-100" />
        <StatCard label="Administradores" value={totalAdmins} icon={UserIcon} iconColor="text-indigo-600" iconBg="bg-indigo-100" />
      </div>

      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={busqueda}
          onChange={e => { setBusqueda(e.target.value); setPage(1) }}
          placeholder="Buscar por nombre, correo o rol..."
          className="w-full pl-9 pr-9 py-2.5 text-sm border border-slate-200 rounded-xl bg-white text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
        />
        {busqueda && (
          <button onClick={() => setBusqueda('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" aria-label="Limpiar">
            <X size={15} />
          </button>
        )}
      </div>

      <Card accent="indigo">
        <CardHeader>
          <CardTitle>Listado de usuarios</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-16 flex items-center justify-center gap-3 text-slate-400">
              <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">Cargando usuarios...</span>
            </div>
          ) : usuariosFiltrados.length === 0 ? (
            <div className="py-16 text-center">
              <Users size={32} className="text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-400">{usuarios.length === 0 ? 'No hay usuarios registrados' : 'Ningún usuario coincide con la búsqueda'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="stitch-table">
                <thead>
                  <tr>
                    <th></th>
                    <th>Nombre</th>
                    <th>Correo</th>
                    <th>Rol</th>
                    <th>Central</th>
                    <th>Caja asignada</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {usuariosPagina.map(u => (
                    <tr key={u.id}>
                      <td>
                        {u.rol !== 'Maestro' && (
                          <button
                            onClick={() => abrirEditar(u)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                            title="Editar usuario"
                          >
                            <Pencil size={13} />
                          </button>
                        )}
                      </td>
                      <td className="font-medium text-slate-900">{u.nombreCompleto}</td>
                      <td className="text-sm text-slate-600">{u.email}</td>
                      <td><Badge variant={rolBadge[u.rol as keyof typeof rolBadge] ?? 'secondary'}>{u.rol}</Badge></td>
                      <td className="text-sm text-slate-600">{u.nombreCentral || '—'}</td>
                      <td className="text-sm text-slate-600">{u.nombreCaja || <span className="text-slate-300 italic">Sin asignar</span>}</td>
                      <td>
                        <div className="flex items-center gap-1">
                          {u.rol === 'Solicitante' && (
                            <button
                              onClick={() => { setAsignando(u); setCajaSeleccionada(''); setError(null) }}
                              className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-teal-600 hover:bg-teal-50 transition-colors"
                              title="Asignar caja"
                            >
                              <ArrowRightLeft size={13} />
                            </button>
                          )}
                          {u.rol !== 'Maestro' && (
                            <button
                              onClick={() => { if (confirm(`¿Eliminar a ${u.nombreCompleto}?`)) eliminarMutation.mutate(u.id) }}
                              disabled={eliminarMutation.isPending && eliminarMutation.variables === u.id}
                              className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors text-slate-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-40"
                              title="Eliminar usuario"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {usuariosFiltrados.length > 0 && (
            <Pagination page={paginaActual} pageSize={pageSize} totalItems={usuariosFiltrados.length} onPageChange={setPage} onPageSizeChange={setPageSize} />
          )}
        </CardContent>
      </Card>

      {/* Modal crear */}
      <Modal open={showModal} onClose={() => { setShowModal(false); resetCrear(); setError(null) }} title="Nuevo Usuario" size="md">
        <form onSubmit={handleSubmitCrear((d) => crearMutation.mutate(d))} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nombre completo</Label>
            <Input placeholder="Juan Pérez" {...registerCrear('nombreCompleto')} error={!!errorsCrear.nombreCompleto} />
            {errorsCrear.nombreCompleto && <p className="text-xs text-red-500">{errorsCrear.nombreCompleto.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Correo electrónico</Label>
            <Input type="email" placeholder="usuario@miraxiontech.com" {...registerCrear('email')} error={!!errorsCrear.email} />
            {errorsCrear.email && <p className="text-xs text-red-500">{errorsCrear.email.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Cédula</Label>
            <Input inputMode="numeric" placeholder="Número de cédula" {...registerCrear('cedula')} error={!!errorsCrear.cedula} />
            {errorsCrear.cedula
              ? <p className="text-xs text-red-500">{errorsCrear.cedula.message}</p>
              : <p className="text-xs text-slate-400">Será la contraseña inicial. El usuario deberá cambiarla en su primer ingreso.</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Rol</Label>
              <Select {...registerCrear('rol')}>
                <option value="Administrador">Administrador</option>
                <option value="Director">Director</option>
                <option value="Solicitante">Solicitante</option>
              </Select>
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

          {/* Solicitante: se asigna a una caja de la central seleccionada */}
          {rolCrear === 'Solicitante' && (
            <div className="space-y-1.5">
              <Label>Caja asignada</Label>
              <Select {...registerCrear('cajaId')} disabled={!centralIdCrear}>
                <option value="">{centralIdCrear ? 'Seleccionar...' : 'Elija primero una central'}</option>
                {cajasDeCentral.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </Select>
              {errorsCrear.cajaId && <p className="text-xs text-red-500">{errorsCrear.cajaId.message}</p>}
              {centralIdCrear && cajasDeCentral.length === 0 && (
                <p className="text-xs text-amber-600">Esta central no tiene cajas registradas. Cree una primero.</p>
              )}
            </div>
          )}

          {error && <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => { setShowModal(false); resetCrear(); setError(null) }}>Cancelar</Button>
            <Button type="submit" className="flex-1" loading={isSubmittingCrear || crearMutation.isPending}>Crear usuario</Button>
          </div>
        </form>
      </Modal>

      {/* Modal editar */}
      <Modal open={!!editing} onClose={() => { setEditing(null); resetEditar(); setError(null) }} title={`Editar — ${editing?.nombreCompleto ?? ''}`} size="md">
        <form onSubmit={handleSubmitEditar((d) => editing && editarMutation.mutate({ id: editing.id, data: d }))} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nombre completo</Label>
            <Input {...registerEditar('nombreCompleto')} error={!!errorsEditar.nombreCompleto} />
            {errorsEditar.nombreCompleto && <p className="text-xs text-red-500">{errorsEditar.nombreCompleto.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Correo electrónico</Label>
            <Input type="email" {...registerEditar('email')} error={!!errorsEditar.email} />
            {errorsEditar.email && <p className="text-xs text-red-500">{errorsEditar.email.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Rol</Label>
              <Select {...registerEditar('rol')}>
                <option value="Administrador">Administrador</option>
                <option value="Director">Director</option>
                <option value="Solicitante">Solicitante</option>
              </Select>
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
            <Label>Nueva contraseña (opcional)</Label>
            <Input type="password" placeholder="Dejar en blanco para no cambiarla" {...registerEditar('nuevaPassword')} error={!!errorsEditar.nuevaPassword} />
            {errorsEditar.nuevaPassword && <p className="text-xs text-red-500">{errorsEditar.nuevaPassword.message}</p>}
          </div>

          {error && <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => { setEditing(null); resetEditar(); setError(null) }}>Cancelar</Button>
            <Button type="submit" className="flex-1" loading={isSubmittingEditar || editarMutation.isPending}>Guardar cambios</Button>
          </div>
        </form>
      </Modal>

      {/* Modal asignar caja */}
      <Modal open={!!asignando} onClose={() => { setAsignando(null); setCajaSeleccionada(''); setError(null) }} title={`Asignar caja — ${asignando?.nombreCompleto ?? ''}`} size="sm">
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            {asignando?.rol === 'Director'
              ? 'Un Director solo puede tener una caja: si la caja elegida ya tiene otro Director, se lo reemplaza.'
              : asignando?.rol === 'Solicitante'
              ? 'El solicitante quedará asignado a esta caja (una sola a la vez) y sus solicitudes irán a su administrador.'
              : 'El usuario se agregará como Administrador de la caja (puede haber varios). Se le quita de cualquier otra caja que administrara.'}
          </p>
          <div className="space-y-1.5">
            <Label>Caja</Label>
            <Select value={cajaSeleccionada} onChange={e => setCajaSeleccionada(e.target.value)}>
              <option value="">Seleccionar...</option>
              {cajas.map(c => <option key={c.id} value={c.id}>{c.nombre} — {c.nombreCentral}</option>)}
            </Select>
          </div>

          {asignando && cajaElegida && (huboReemplazo || cambiaCentral) && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800 space-y-1">
              {huboReemplazo && (
                <p>⚠ <b>{cajaElegida.nombreDirector}</b> quedará sin caja asignada (esta caja pasa a {asignando.nombreCompleto}).</p>
              )}
              {cambiaCentral && (
                <p>⚠ {asignando.nombreCompleto} pasará de <b>{asignando.nombreCentral || 'sin central'}</b> a <b>{cajaElegida.nombreCentral}</b>.</p>
              )}
            </div>
          )}

          {error && <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => { setAsignando(null); setCajaSeleccionada(''); setError(null) }}>Cancelar</Button>
            <Button
              type="button"
              className="flex-1"
              disabled={!cajaSeleccionada}
              loading={asignarMutation.isPending}
              onClick={() => {
                if (!asignando) return
                const advertencias: string[] = []
                if (huboReemplazo) advertencias.push(`${cajaElegida!.nombreDirector} quedará sin caja asignada`)
                if (cambiaCentral) advertencias.push(`${asignando.nombreCompleto} cambiará a la central ${cajaElegida!.nombreCentral}`)
                if (advertencias.length > 0 && !confirm(`¿Estás seguro?\n\n${advertencias.join('\n')}`)) return
                asignarMutation.mutate({ userId: asignando.id, cajaId: Number(cajaSeleccionada) })
              }}
            >
              Asignar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
