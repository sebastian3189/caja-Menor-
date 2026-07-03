import api from './axios'
import type { LegalizacionDto, CrearLegalizacionDto, ResumenLegalizacionesDto, ReciboDto } from '@/types'

export const getLegalizaciones = (cajaId: number) =>
  api.get<LegalizacionDto[]>(`/cajas/${cajaId}/legalizaciones`).then(r => r.data)

export const getResumenLegalizaciones = (cajaId: number) =>
  api.get<ResumenLegalizacionesDto>(`/cajas/${cajaId}/legalizaciones/resumen`).then(r => r.data)

export const crearLegalizacion = (cajaId: number, dto: CrearLegalizacionDto) =>
  api.post<LegalizacionDto>(`/cajas/${cajaId}/legalizaciones`, dto).then(r => r.data)

export const iniciarReembolso = (cajaId: number, legalizacionId: number) =>
  api.post<LegalizacionDto>(`/cajas/${cajaId}/legalizaciones/${legalizacionId}/reembolsar`).then(r => r.data)

export const getSiguienteCodigoLegalizacion = (cajaId: number) =>
  api.get<{ codigo: string }>(`/cajas/${cajaId}/legalizaciones/siguiente-codigo`).then(r => r.data)

export const subirRecibo = (cajaId: number, legalizacionId: number, file: File) => {
  const formData = new FormData()
  formData.append('archivo', file)
  return api.post<ReciboDto>(
    `/cajas/${cajaId}/legalizaciones/${legalizacionId}/recibos`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  ).then(r => r.data)
}

export const eliminarRecibo = (cajaId: number, legalizacionId: number, reciboId: number) =>
  api.delete(`/cajas/${cajaId}/legalizaciones/${legalizacionId}/recibos/${reciboId}`).then(r => r.data)
