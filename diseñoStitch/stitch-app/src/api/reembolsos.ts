import api from './axios'
import type { ResumenReembolsosDto } from '@/types'

export const getReembolsos = (cajaId: number) =>
  api.get<ResumenReembolsosDto>(`/cajas/${cajaId}/reembolsos`).then(r => r.data)

export const activarReembolsos = (cajaId: number) =>
  api.post(`/cajas/${cajaId}/reembolsos/activar`).then(r => r.data)

export const confirmarReembolsos = (cajaId: number) =>
  api.post(`/cajas/${cajaId}/reembolsos/confirmar`).then(r => r.data)

export const cancelarReembolso = (cajaId: number, reembolsoId: number) =>
  api.delete(`/cajas/${cajaId}/reembolsos/${reembolsoId}/cancelar`).then(r => r.data)
