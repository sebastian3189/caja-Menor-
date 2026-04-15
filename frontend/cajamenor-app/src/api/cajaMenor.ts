import api from './axios'
import type { DashboardDto } from '@/types'

export const getDashboard = (cajaId: number) =>
  api.get<DashboardDto>(`/cajamenor/${cajaId}/dashboard`).then(r => r.data)

export const getMiCaja = () =>
  api.get('/cajamenor/mia').then(r => r.data)
