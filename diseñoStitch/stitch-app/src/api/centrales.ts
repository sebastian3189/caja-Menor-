import api from './axios'
import type { CentralDto, CrearCentralDto, EditarCentralDto } from '@/types'

export const listarCentrales = () =>
  api.get<CentralDto[]>('/centrales').then(r => r.data)

export const crearCentral = (dto: CrearCentralDto) =>
  api.post<CentralDto>('/centrales', dto).then(r => r.data)

export const editarCentral = (id: number, dto: EditarCentralDto) =>
  api.put<CentralDto>(`/centrales/${id}`, dto).then(r => r.data)

export const eliminarCentral = (id: number) =>
  api.delete(`/centrales/${id}`).then(r => r.data)
