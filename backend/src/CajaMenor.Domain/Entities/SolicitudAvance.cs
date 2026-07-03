using CajaMenor.Domain.Enums;

namespace CajaMenor.Domain.Entities;

/// <summary>
/// Solicitud de avance creada por un usuario con rol Solicitante.
/// El Administrador de la caja la acepta (genera un Avance) o la rechaza.
/// </summary>
public class SolicitudAvance
{
    public int Id { get; set; }
    public int CajaId { get; set; }
    public int SolicitanteId { get; set; }
    public decimal ValorSolicitado { get; set; }
    public string Descripcion { get; set; } = string.Empty;
    public EstadoSolicitud Estado { get; set; } = EstadoSolicitud.Pendiente;
    public DateTime FechaSolicitud { get; set; } = DateTime.UtcNow;
    public DateTime? FechaRespuesta { get; set; }
    /// <summary>Avance generado al aceptar la solicitud.</summary>
    public int? AvanceId { get; set; }
    public string? MotivoRechazo { get; set; }

    public CajaMenorEntity Caja { get; set; } = null!;
    public UsuarioApp Solicitante { get; set; } = null!;
    public Avance? Avance { get; set; }
}
