import api from './axios'
import type { ArqueoDto } from '@/types'

export const getArqueo = (cajaId: number) =>
  api.get<ArqueoDto>(`/cajas/${cajaId}/arqueo`).then(r => r.data)

export const generarArqueo = (cajaId: number) =>
  api.post<ArqueoDto>(`/cajas/${cajaId}/arqueo/generar`).then(r => r.data)

export const subirFirmaDirectivo = (cajaId: number, firma: File) => {
  const form = new FormData()
  form.append('firma', firma)
  return api.post(`/cajas/${cajaId}/arqueo/firma-directivo`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data)
}

export const subirFirmaAdministrador = (cajaId: number, firma: File) => {
  const form = new FormData()
  form.append('firma', firma)
  return api.post(`/cajas/${cajaId}/arqueo/firma-administrador`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data)
}

export const eliminarFirmaDirectivo = (cajaId: number) =>
  api.delete(`/cajas/${cajaId}/arqueo/firma-directivo`).then(r => r.data)

export const eliminarFirmaAdministrador = (cajaId: number) =>
  api.delete(`/cajas/${cajaId}/arqueo/firma-administrador`).then(r => r.data)

export const enviarTesoreria = (cajaId: number) =>
  api.post(`/cajas/${cajaId}/arqueo/enviar-tesoreria`).then(r => r.data)

export const descargarPdf = (cajaId: number) =>
  api.get(`/cajas/${cajaId}/arqueo/pdf`, { responseType: 'blob' }).then(r => r.data)
