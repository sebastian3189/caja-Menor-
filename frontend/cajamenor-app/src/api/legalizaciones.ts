import api from './axios'
import type { LegalizacionDto, CrearLegalizacionDto, ResumenLegalizacionesDto } from '@/types'

export const getLegalizaciones = (cajaId: number) =>
  api.get<LegalizacionDto[]>(`/cajas/${cajaId}/legalizaciones`).then(r => r.data)

export const getResumenLegalizaciones = (cajaId: number) =>
  api.get<ResumenLegalizacionesDto>(`/cajas/${cajaId}/legalizaciones/resumen`).then(r => r.data)

export const crearLegalizacion = (cajaId: number, dto: CrearLegalizacionDto) =>
  api.post<LegalizacionDto>(`/cajas/${cajaId}/legalizaciones`, dto).then(r => r.data)

export const iniciarReembolso = (cajaId: number, legalizacionId: number) =>
  api.post<LegalizacionDto>(`/cajas/${cajaId}/legalizaciones/${legalizacionId}/reembolsar`).then(r => r.data)
