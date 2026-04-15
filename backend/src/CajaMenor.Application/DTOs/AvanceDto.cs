using CajaMenor.Domain.Enums;

namespace CajaMenor.Application.DTOs;

public class AvanceDto
{
    public int Id { get; set; }
    public int CajaId { get; set; }
    public string CodigoAvance { get; set; } = string.Empty;
    public DateTime FechaEnvio { get; set; }
    public decimal ValorAvance { get; set; }
    public string Descripcion { get; set; } = string.Empty;
    public string Solicitante { get; set; } = string.Empty;
    public string Estado { get; set; } = string.Empty;
    public string? TipoAvance { get; set; }
    public string EstadoReembolso { get; set; } = string.Empty;
    public string NombreCaja { get; set; } = string.Empty;
}

public class CrearAvanceDto
{
    public int CajaId { get; set; }
    public string CodigoAvance { get; set; } = string.Empty;
    public DateTime FechaEnvio { get; set; }
    public decimal ValorAvance { get; set; }
    public string Descripcion { get; set; } = string.Empty;
    public string Solicitante { get; set; } = string.Empty;
}

public class EditarAvanceDto
{
    public string CodigoAvance { get; set; } = string.Empty;
    public DateTime FechaEnvio { get; set; }
    public decimal ValorAvance { get; set; }
    public string Descripcion { get; set; } = string.Empty;
    public string Solicitante { get; set; } = string.Empty;
}

public class ResumenAvancesDto
{
    public int Total { get; set; }
    public int Pendientes { get; set; }
    public int Legalizados { get; set; }
    public decimal PorcentajePendientes { get; set; }
    public decimal PorcentajeLegalizados { get; set; }
}
