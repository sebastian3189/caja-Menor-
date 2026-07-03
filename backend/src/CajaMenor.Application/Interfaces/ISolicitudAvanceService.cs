using CajaMenor.Application.Common;
using CajaMenor.Application.DTOs;

namespace CajaMenor.Application.Interfaces;

public interface ISolicitudAvanceService
{
    /// <summary>El Solicitante crea una solicitud para la caja a la que está asignado.</summary>
    Task<Result<SolicitudAvanceDto>> CrearAsync(string identityUserId, CrearSolicitudAvanceDto dto);

    /// <summary>Solicitudes del propio Solicitante autenticado.</summary>
    Task<Result<List<SolicitudAvanceDto>>> ObtenerMiasAsync(string identityUserId);

    /// <summary>Todas las solicitudes de una caja (para el Administrador).</summary>
    Task<Result<List<SolicitudAvanceDto>>> ObtenerPorCajaAsync(int cajaId);

    /// <summary>Solicitudes pendientes de una caja (fuente de la notificación al Administrador).</summary>
    Task<Result<List<SolicitudAvanceDto>>> ObtenerPendientesPorCajaAsync(int cajaId);

    /// <summary>Acepta la solicitud: genera el Avance correspondiente y la marca como Aceptada.</summary>
    Task<Result<SolicitudAvanceDto>> AceptarAsync(int solicitudId);

    /// <summary>Rechaza la solicitud con un motivo opcional.</summary>
    Task<Result<SolicitudAvanceDto>> RechazarAsync(int solicitudId, string? motivo);

    /// <summary>Solicitantes asignados a la caja (para el desplegable del formulario de avance).</summary>
    Task<Result<List<SolicitanteDto>>> ObtenerSolicitantesDeCajaAsync(int cajaId);
}
