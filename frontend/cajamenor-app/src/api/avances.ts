import api from './axios'
import type { AvanceDto, CrearAvanceDto, ResumenAvancesDto } from '@/types'

export const getAvances = (cajaId: number) =>
  api.get<AvanceDto[]>(`/cajas/${cajaId}/avances`).then(r => r.data)

export const getResumenAvances = (cajaId: number) =>
  api.get<ResumenAvancesDto>(`/cajas/${cajaId}/avances/resumen`).then(r => r.data)

export const getAvancesPendientes = (cajaId: number) =>
  api.get<AvanceDto[]>(`/cajas/${cajaId}/avances/pendientes`).then(r => r.data)

export const crearAvance = (cajaId: number, dto: CrearAvanceDto) =>
  api.post<AvanceDto>(`/cajas/${cajaId}/avances`, dto).then(r => r.data)
