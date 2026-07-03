import api from './axios'
import type { DashboardDto, CajaMenorDto, CrearCajaMenorDto, EditarCajaMenorDto } from '@/types'

export const getDashboard = (cajaId: number) =>
  api.get<DashboardDto>(`/cajamenor/${cajaId}/dashboard`).then(r => r.data)

export const getMiCaja = () =>
  api.get('/cajamenor/mia').then(r => r.data)

// ── Panel Maestro: gestión de cajas ──
export const listarCajas = () =>
  api.get<CajaMenorDto[]>('/cajamenor').then(r => r.data)

export const crearCaja = (dto: CrearCajaMenorDto) =>
  api.post<CajaMenorDto>('/cajamenor', dto).then(r => r.data)

export const editarCaja = (id: number, dto: EditarCajaMenorDto) =>
  api.put<CajaMenorDto>(`/cajamenor/${id}`, dto).then(r => r.data)

export const eliminarCaja = (id: number) =>
  api.delete(`/cajamenor/${id}`).then(r => r.data)

export const cerrarCaja = (id: number) =>
  api.post<CajaMenorDto>(`/cajamenor/${id}/cerrar`).then(r => r.data)

export const reabrirCaja = (id: number) =>
  api.post<CajaMenorDto>(`/cajamenor/${id}/reabrir`).then(r => r.data)
