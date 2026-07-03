import api from './axios'
import type { AvanceDto, CrearAvanceDto, EditarAvanceDto, ResumenAvancesDto } from '@/types'

export const getAvances = (cajaId: number) =>
  api.get<AvanceDto[]>(`/cajas/${cajaId}/avances`).then(r => r.data)

export const getResumenAvances = (cajaId: number) =>
  api.get<ResumenAvancesDto>(`/cajas/${cajaId}/avances/resumen`).then(r => r.data)

export const getAvancesPendientes = (cajaId: number) =>
  api.get<AvanceDto[]>(`/cajas/${cajaId}/avances/pendientes`).then(r => r.data)

export const crearAvance = (cajaId: number, dto: CrearAvanceDto) =>
  api.post<AvanceDto>(`/cajas/${cajaId}/avances`, dto).then(r => r.data)

export const editarAvance = (cajaId: number, id: number, dto: EditarAvanceDto) =>
  api.put<AvanceDto>(`/cajas/${cajaId}/avances/${id}`, dto).then(r => r.data)

export const getSiguienteCodigoAvance = (cajaId: number) =>
  api.get<{ codigo: string }>(`/cajas/${cajaId}/avances/siguiente-codigo`).then(r => r.data)

export const eliminarAvance = (cajaId: number, avanceId: number) =>
  api.delete(`/cajas/${cajaId}/avances/${avanceId}`).then(r => r.data)

export const exportarAvances = (cajaId: number) =>
  api.get(`/cajas/${cajaId}/avances/exportar`, { responseType: 'blob' }).then(r => r.data)

export const descargarPdfAvance = (cajaId: number, avanceId: number) =>
  api.get(`/cajas/${cajaId}/avances/${avanceId}/pdf`, { responseType: 'blob' }).then(r => r.data)
