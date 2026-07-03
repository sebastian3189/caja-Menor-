import api from './axios'
import type { LoginDto, LoginResponse, ForgotPasswordDto, ResetPasswordDto } from '@/types'

export const login = (dto: LoginDto) =>
  api.post<LoginResponse>('/auth/login', dto).then(r => r.data)

export const forgotPassword = (dto: ForgotPasswordDto) =>
  api.post<{ message: string }>('/auth/forgot-password', dto).then(r => r.data)

export const resetPassword = (dto: ResetPasswordDto) =>
  api.post<{ message: string }>('/auth/reset-password', dto).then(r => r.data)
