export interface LoginDto {
  email: string
  password: string
}

export interface ForgotPasswordDto {
  email: string
}

export interface ResetPasswordDto {
  email: string
  token: string
  nuevaPassword: string
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
  mustChangePassword: boolean
}

export interface CambiarPasswordDto {
  passwordActual: string
  nuevaPassword: string
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
  directorId: number
  nombreDirector: string
  administradorIds: number[]
  nombreAdministrador: string
  estado: 'Abierta' | 'Cerrada'
  fechaApertura: string
  puedeEditarApertura: boolean
  puedeEliminar: boolean
}

export interface CrearCajaMenorDto {
  centralId: number
  nombre: string
  valorApertura: number
  directorId: number
  administradorId: number
}

export interface EditarCajaMenorDto {
  nombre: string
  centralId: number
  valorApertura: number
  directorId: number
  administradorId: number
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

export interface EditarAvanceDto {
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
  reembolsados: number
  valorReembolsados: number
}

export interface ReciboDto {
  id: number
  nombreOriginal: string
  url: string
  fechaSubida: string
  valorOCR?: number | null
  validadoOCR: boolean
  notaOCR?: string | null
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
  recibos: ReciboDto[]
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

export interface EditarLegalizacionDto {
  codigoLegalizacion: string
  fechaLegalizacion: string
  monto: number
  descripcion: string
  tipoLegalizacion: string
}

export interface ResumenLegalizacionesDto {
  total: number
  sinAvance: number
  conAvance: number
  reembolsadas: number
  valorReembolsadas: number
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
  /** Respuesta de Tesorería al último arqueo enviado. */
  estadoTesoreria?: 'Pendiente' | 'Aceptado' | 'Denegado' | null
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

export interface AuditoriaDto {
  id: number
  tabla: string
  registroId: number
  usuario: string
  accion: string
  fecha: string
  datosAnteriores?: string | null
  datosNuevos?: string | null
}

// ── Panel Maestro: Centrales ──
export interface CentralDto {
  id: number
  nombre: string
  codigoCentral: string
  totalUsuarios: number
  totalCajas: number
}

export interface CrearCentralDto {
  nombre: string
  codigoCentral: string
}

export interface EditarCentralDto {
  nombre: string
  codigoCentral: string
}

// ── Panel Maestro: Usuarios ──
export interface UsuarioListDto {
  /** Id de Identity (GUID). Se usa en las rutas de auth: editar/eliminar/asignar-caja. */
  id: string
  /** Id interno de UsuarioApp. Se usa como directorId/administradorId al crear o editar una caja. */
  usuarioAppId: number
  nombreCompleto: string
  email: string
  rol: string
  centralId: number
  nombreCentral: string
  nombreCaja: string
}

export interface RegistrarUsuarioDto {
  nombreCompleto: string
  email: string
  /** Cédula: es la contraseña inicial; el usuario deberá cambiarla en su primer ingreso. */
  cedula: string
  rol: 'Director' | 'Administrador' | 'Solicitante'
  centralId: number
  /** Solo para rol Solicitante: caja a la que queda asignado al crearlo. */
  cajaId?: number
}

export interface EditarUsuarioDto {
  nombreCompleto: string
  email: string
  rol: string
  centralId: number
  nuevaPassword?: string
}

// ── Solicitudes de avance ──
export interface SolicitudAvanceDto {
  id: number
  cajaId: number
  nombreCaja: string
  solicitanteId: number
  nombreSolicitante: string
  valorSolicitado: number
  descripcion: string
  estado: 'Pendiente' | 'Aceptada' | 'Rechazada'
  fechaSolicitud: string
  fechaRespuesta?: string | null
  avanceId?: number | null
  codigoAvance?: string | null
  motivoRechazo?: string | null
}

export interface CrearSolicitudAvanceDto {
  valorSolicitado: number
  descripcion: string
}

/** Solicitante para el desplegable del formulario de avance del Administrador. */
export interface SolicitanteDto {
  id: number
  nombreCompleto: string
  email: string
}
