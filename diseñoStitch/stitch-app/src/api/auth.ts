import api from './axios'
import type { LoginDto, LoginResponse } from '@/types'

export const login = (dto: LoginDto) =>
  api.post<LoginResponse>('/auth/login', dto).then(r => r.data)
