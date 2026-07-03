import api from './axios'
import type { SolicitudAvanceDto, CrearSolicitudAvanceDto, SolicitanteDto } from '@/types'

// ── Solicitante ──
export const crearSolicitud = (dto: CrearSolicitudAvanceDto) =>
  api.post<SolicitudAvanceDto>('/solicitudes', dto).then(r => r.data)

export const getMisSolicitudes = () =>
  api.get<SolicitudAvanceDto[]>('/solicitudes/mias').then(r => r.data)

// ── Administrador (por caja) ──
export const getSolicitudes = (cajaId: number) =>
  api.get<SolicitudAvanceDto[]>(`/cajas/${cajaId}/solicitudes`).then(r => r.data)

export const getSolicitudesPendientes = (cajaId: number) =>
  api.get<SolicitudAvanceDto[]>(`/cajas/${cajaId}/solicitudes/pendientes`).then(r => r.data)

export const aceptarSolicitud = (cajaId: number, id: number) =>
  api.post<SolicitudAvanceDto>(`/cajas/${cajaId}/solicitudes/${id}/aceptar`).then(r => r.data)

export const rechazarSolicitud = (cajaId: number, id: number, motivo?: string) =>
  api.post<SolicitudAvanceDto>(`/cajas/${cajaId}/solicitudes/${id}/rechazar`, { motivo }).then(r => r.data)

export const getSolicitantesDeCaja = (cajaId: number) =>
  api.get<SolicitanteDto[]>(`/cajas/${cajaId}/solicitantes`).then(r => r.data)
