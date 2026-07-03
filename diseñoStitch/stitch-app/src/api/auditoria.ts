import api from './axios'
import type { AuditoriaDto } from '@/types'

export const getAuditoria = (limite = 200) =>
  api.get<AuditoriaDto[]>(`/auditoria`, { params: { limite } }).then(r => r.data)
