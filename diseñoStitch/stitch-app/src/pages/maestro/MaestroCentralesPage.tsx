import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Landmark, Plus, Pencil, Trash2, Search, X, Building2, Users } from 'lucide-react'
import { listarCentrales, crearCentral, editarCentral, eliminarCentral } from '@/api/centrales'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { StatCard } from '@/components/ui/StatCard'
import { Modal } from '@/components/ui/Modal'
import { PageHeader } from '@/components/ui/PageHeader'
import type { CentralDto } from '@/types'

const centralSchema = z.object({
  nombre: z.string().min(1, 'Requerido'),
  codigoCentral: z.string().min(1, 'Requerido'),
})
type CentralForm = z.infer<typeof centralSchema>

export function MaestroCentralesPage() {
  const queryClient = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<CentralDto | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [error, setError] = useState<string | null>(null)

  const { data: centrales = [], isLoading } = useQuery({
    queryKey: ['maestro-centrales'],
    queryFn: listarCentrales,
  })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CentralForm>({ resolver: zodResolver(centralSchema) })

  const crearMutation = useMutation({
    mutationFn: crearCentral,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maestro-centrales'] })
      setShowModal(false)
      reset()
      setError(null)
    },
    onError: (e: any) => setError(e?.response?.data?.message ?? 'Error al crear la central.'),
  })

  const editarMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: CentralForm }) => editarCentral(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maestro-centrales'] })
      setEditing(null)
      reset()
      setError(null)
    },
    onError: (e: any) => setError(e?.response?.data?.message ?? 'Error al editar la central.'),
  })

  const eliminarMutation = useMutation({
    mutationFn: eliminarCentral,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['maestro-centrales'] }),
  })

  const abrirEditar = (c: CentralDto) => {
    setEditing(c)
    reset({ nombre: c.nombre, codigoCentral: c.codigoCentral })
    setError(null)
  }

  const filtradas = centrales.filter(c => {
    if (!busqueda) return true
    const q = busqueda.toLowerCase()
    return c.nombre.toLowerCase().includes(q) || c.codigoCentral.toLowerCase().includes(q)
  })

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Centrales"
        subtitle="Organizaciones que agrupan usuarios y cajas menores"
        icon={Landmark}
        iconColor="text-teal-600"
        iconBg="bg-teal-100"
        actions={
          <Button onClick={() => { setShowModal(true); reset({ nombre: '', codigoCentral: '' }); setError(null) }}>
            <Plus size={15} /> Nueva central
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard label="Total centrales" value={centrales.length} icon={Landmark} iconColor="text-teal-600" iconBg="bg-teal-100" />
        <StatCard label="Usuarios totales" value={centrales.reduce((s, c) => s + c.totalUsuarios, 0)} icon={Users} iconColor="text-indigo-600" iconBg="bg-indigo-100" />
      </div>

      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre o código..."
          className="w-full pl-9 pr-9 py-2.5 text-sm border border-slate-200 rounded-xl bg-white text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
        />
        {busqueda && (
          <button onClick={() => setBusqueda('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" aria-label="Limpiar">
            <X size={15} />
          </button>
        )}
      </div>

      <Card accent="teal">
        <CardHeader>
          <CardTitle>Listado de centrales</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-16 flex items-center justify-center gap-3 text-slate-400">
              <div className="w-5 h-5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">Cargando centrales...</span>
            </div>
          ) : filtradas.length === 0 ? (
            <div className="py-16 text-center">
              <Building2 size={32} className="text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-400">{centrales.length === 0 ? 'No hay centrales registradas' : 'Ninguna central coincide con la búsqueda'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="stitch-table">
                <thead>
                  <tr>
                    <th></th>
                    <th>Código</th>
                    <th>Nombre</th>
                    <th>Usuarios</th>
                    <th>Cajas</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtradas.map(c => (
                    <tr key={c.id}>
                      <td>
                        <button
                          onClick={() => abrirEditar(c)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-teal-600 hover:bg-teal-50 transition-colors"
                          title="Editar central"
                        >
                          <Pencil size={13} />
                        </button>
                      </td>
                      <td>
                        <span className="font-mono text-xs font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md">
                          {c.codigoCentral}
                        </span>
                      </td>
                      <td className="font-medium text-slate-900">{c.nombre}</td>
                      <td className="text-sm text-slate-600">{c.totalUsuarios}</td>
                      <td className="text-sm text-slate-600">{c.totalCajas}</td>
                      <td>
                        <button
                          onClick={() => { if (confirm(`¿Eliminar la central ${c.nombre}?`)) eliminarMutation.mutate(c.id) }}
                          disabled={c.totalUsuarios > 0 || c.totalCajas > 0 || (eliminarMutation.isPending && eliminarMutation.variables === c.id)}
                          title={c.totalUsuarios > 0 || c.totalCajas > 0 ? 'No se puede eliminar: tiene usuarios o cajas asociadas' : 'Eliminar central'}
                          className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors text-slate-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-slate-400 disabled:hover:bg-transparent"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal crear/editar */}
      <Modal
        open={showModal || !!editing}
        onClose={() => { setShowModal(false); setEditing(null); reset(); setError(null) }}
        title={editing ? `Editar — ${editing.codigoCentral}` : 'Nueva Central'}
        size="sm"
      >
        <form
          onSubmit={handleSubmit((d) => editing ? editarMutation.mutate({ id: editing.id, data: d }) : crearMutation.mutate(d))}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label>Nombre</Label>
            <Input placeholder="Central Norte" {...register('nombre')} error={!!errors.nombre} />
            {errors.nombre && <p className="text-xs text-red-500">{errors.nombre.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Código</Label>
            <Input placeholder="NOR-001" {...register('codigoCentral')} error={!!errors.codigoCentral} />
            {errors.codigoCentral && <p className="text-xs text-red-500">{errors.codigoCentral.message}</p>}
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => { setShowModal(false); setEditing(null); reset(); setError(null) }}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" loading={isSubmitting || crearMutation.isPending || editarMutation.isPending}>
              {editing ? 'Guardar cambios' : 'Crear central'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
