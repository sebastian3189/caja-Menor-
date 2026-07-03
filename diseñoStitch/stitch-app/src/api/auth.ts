import api from './axios'
import type { LoginDto, LoginResponse, UsuarioListDto, RegistrarUsuarioDto, EditarUsuarioDto, ForgotPasswordDto, ResetPasswordDto, CambiarPasswordDto } from '@/types'

export const login = (dto: LoginDto) =>
  api.post<LoginResponse>('/auth/login', dto).then(r => r.data)

// ── Recuperación de contraseña ──
export const forgotPassword = (dto: ForgotPasswordDto) =>
  api.post<{ message: string }>('/auth/forgot-password', dto).then(r => r.data)

export const resetPassword = (dto: ResetPasswordDto) =>
  api.post<{ message: string }>('/auth/reset-password', dto).then(r => r.data)

// ── Cambio de contraseña (primer ingreso obligatorio o voluntario) ──
export const cambiarPassword = (dto: CambiarPasswordDto) =>
  api.post<{ message: string }>('/auth/cambiar-password', dto).then(r => r.data)

/** Revoca el token actual en el servidor (lista negra). No falla el cierre de sesión local si el request falla. */
export const logoutServidor = () =>
  api.post('/auth/logout').then(r => r.data).catch(() => undefined)

// ── Panel Maestro: gestión de usuarios ──
export const listarUsuarios = () =>
  api.get<UsuarioListDto[]>('/auth/usuarios').then(r => r.data)

export const registrarUsuario = (dto: RegistrarUsuarioDto) =>
  api.post('/auth/registrar', dto).then(r => r.data)

export const editarUsuario = (userId: string, dto: EditarUsuarioDto) =>
  api.put(`/auth/usuarios/${userId}`, dto).then(r => r.data)

export const eliminarUsuario = (userId: string) =>
  api.delete(`/auth/usuarios/${userId}`).then(r => r.data)

export const asignarCaja = (userId: string, cajaId: number) =>
  api.put(`/auth/usuarios/${userId}/asignar-caja/${cajaId}`).then(r => r.data)
