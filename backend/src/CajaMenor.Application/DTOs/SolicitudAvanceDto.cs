namespace CajaMenor.Application.DTOs;

public class SolicitudAvanceDto
{
    public int Id { get; set; }
    public int CajaId { get; set; }
    public string NombreCaja { get; set; } = string.Empty;
    public int SolicitanteId { get; set; }
    public string NombreSolicitante { get; set; } = string.Empty;
    public decimal ValorSolicitado { get; set; }
    public string Descripcion { get; set; } = string.Empty;
    public string Estado { get; set; } = string.Empty;
    public DateTime FechaSolicitud { get; set; }
    public DateTime? FechaRespuesta { get; set; }
    public int? AvanceId { get; set; }
    public string? CodigoAvance { get; set; }
    public string? MotivoRechazo { get; set; }
}

public class CrearSolicitudAvanceDto
{
    public decimal ValorSolicitado { get; set; }
    public string Descripcion { get; set; } = string.Empty;
}

public class RechazarSolicitudDto
{
    public string? Motivo { get; set; }
}

/// <summary>Solicitante disponible para el desplegable del formulario de avance del Administrador.</summary>
public class SolicitanteDto
{
    public int Id { get; set; }
    public string NombreCompleto { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
}
