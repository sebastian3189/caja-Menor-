import api from './axios'
import type { LegalizacionDto, CrearLegalizacionDto, EditarLegalizacionDto, ResumenLegalizacionesDto, ReciboDto } from '@/types'

export const getLegalizaciones = (cajaId: number) =>
  api.get<LegalizacionDto[]>(`/cajas/${cajaId}/legalizaciones`).then(r => r.data)

export const getResumenLegalizaciones = (cajaId: number) =>
  api.get<ResumenLegalizacionesDto>(`/cajas/${cajaId}/legalizaciones/resumen`).then(r => r.data)

export const crearLegalizacion = (cajaId: number, dto: CrearLegalizacionDto) =>
  api.post<LegalizacionDto>(`/cajas/${cajaId}/legalizaciones`, dto).then(r => r.data)

export const iniciarReembolso = (cajaId: number, legalizacionId: number) =>
  api.post<LegalizacionDto>(`/cajas/${cajaId}/legalizaciones/${legalizacionId}/reembolsar`).then(r => r.data)

export const subirRecibo = (cajaId: number, legalizacionId: number, archivo: File) => {
  const form = new FormData()
  form.append('archivo', archivo)
  return api.post<ReciboDto>(`/cajas/${cajaId}/legalizaciones/${legalizacionId}/recibos`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data)
}

export const eliminarRecibo = (cajaId: number, legalizacionId: number, reciboId: number) =>
  api.delete(`/cajas/${cajaId}/legalizaciones/${legalizacionId}/recibos/${reciboId}`).then(r => r.data)

export const editarLegalizacion = (cajaId: number, id: number, dto: EditarLegalizacionDto) =>
  api.put<LegalizacionDto>(`/cajas/${cajaId}/legalizaciones/${id}`, dto).then(r => r.data)
