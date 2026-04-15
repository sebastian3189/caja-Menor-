export interface LoginDto {
  email: string
  password: string
}

export interface LoginResponse {
  token: string
  refreshToken: string
  expiration: string
  userId: string
  nombreCompleto: string
  email: string
  rol: string
  cajaId: number
  nombreCaja: string
}

export interface CajaMenorDto {
  id: number
  centralId: number
  codigoCentral: string
  nombreCentral: string
  nombre: string
  valorApertura: number
  disponible: number
  totalUsado: number
  nombreDirector: string
  nombreAdministrador: string
  estado: string
  fechaApertura: string
}

export interface AvanceDto {
  id: number
  cajaId: number
  codigoAvance: string
  fechaEnvio: string
  valorAvance: number
  descripcion: string
  solicitante: string
  estado: 'Pendiente' | 'Legalizado'
  tipoAvance?: 'Total' | 'Sobrante' | 'Faltante' | null
  estadoReembolso: 'SinReembolso' | 'EnProceso' | 'Reembolsado'
  nombreCaja: string
}

export interface CrearAvanceDto {
  cajaId: number
  codigoAvance: string
  fechaEnvio: string
  valorAvance: number
  descripcion: string
  solicitante: string
}

export interface ResumenAvancesDto {
  total: number
  pendientes: number
  legalizados: number
  porcentajePendientes: number
  porcentajeLegalizados: number
}

export interface LegalizacionDto {
  id: number
  cajaId: number
  codigoLegalizacion: string
  monto: number
  descripcion: string
  tipoLegalizacion: string
  fechaLegalizacion: string
  avanceId?: number | null
  codigoAvance?: string | null
  valorAvance: number
  diferencia: number
  descuentoCaja: number
  valorReembolsar: number
  estadoReembolso: 'SinReembolso' | 'EnProceso' | 'Reembolsado'
  nombreCaja: string
  reembolsoFinalizado: boolean
}

export interface CrearLegalizacionDto {
  cajaId: number
  codigoLegalizacion: string
  monto: number
  descripcion: string
  tipoLegalizacion: string
  fechaLegalizacion: string
  avanceId?: number | null
}

export interface ResumenLegalizacionesDto {
  total: number
  sinAvance: number
  conAvance: number
}

export interface ReembolsoDto {
  id: number
  legalizacionId: number
  codigoLegalizacion: string
  avanceId?: number | null
  codigoAvance?: string | null
  codigoCentral: string
  valorAvance: number
  valorLegalizado: number
  debe: number
  debemos: number
  monto: number
  estado: 'SinReembolso' | 'EnProceso' | 'Reembolsado'
  fechaReembolso: string
  fechaConfirmacion?: string | null
}

export interface ResumenReembolsosDto {
  sinReembolso: ReembolsoDto[]
  totalPendiente: number
  historico: ReembolsoDto[]
}

export interface ArqueoDto {
  id: number
  cajaId: number
  nombreCaja: string
  fechaArqueo: string
  valorApertura: number
  disponibleCaja: number
  avancesPendientesLegalizar: number
  valorAvancesPendientes: number
  legalizacionesSinAvance: number
  valorLegalizacionesSinAvance: number
  valorLegalizaciones: number
  totalReembolso: number
  tieneFirmaDirectivo: boolean
  tieneFirmaAdministrador: boolean
  rutaFirmaDirectivo?: string | null
  rutaFirmaAdministrador?: string | null
  fechaEnvioTesoreria?: string | null
  estado: string
  resumenMovimientos: ResumenMovimientosDto
}

export interface ResumenMovimientosDto {
  avancesPendientesLegalizar: number
  valorAvancesPendientesLegalizar: number
  avancesPendientesReembolso: number
  valorAvancesPendientesReembolso: number
  legalizacionesConAvance: number
  valorLegalizacionesConAvance: number
  legalizacionesSinAvance: number
  valorLegalizacionesSinAvance: number
  reembolsosSinReembolsar: number
  valorReembolsosSinReembolsar: number
}

export interface DashboardDto {
  caja: CajaMenorDto
  avances: ResumenAvancesDto
  legalizaciones: ResumenLegalizacionesDto
}
