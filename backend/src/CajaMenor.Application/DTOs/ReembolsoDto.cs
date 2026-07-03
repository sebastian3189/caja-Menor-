namespace CajaMenor.Application.DTOs;

public class ReembolsoDto
{
    public int Id { get; set; }
    public int LegalizacionId { get; set; }
    public string CodigoLegalizacion { get; set; } = string.Empty;
    public int? AvanceId { get; set; }
    public string? CodigoAvance { get; set; }
    public string CodigoCentral { get; set; } = string.Empty;
    public decimal ValorAvance { get; set; }
    public decimal ValorLegalizado { get; set; }
    public decimal Debe { get; set; }
    public decimal Debemos { get; set; }
    public decimal Monto { get; set; }
    public string Estado { get; set; } = string.Empty;
    public DateTime FechaReembolso { get; set; }
    public DateTime? FechaConfirmacion { get; set; }
}

public class ResumenReembolsosDto
{
    public List<ReembolsoDto> SinReembolso { get; set; } = [];
    public decimal TotalPendiente { get; set; }
    public List<ReembolsoDto> Historico { get; set; } = [];
    /// <summary>Respuesta de Tesorería al último arqueo enviado: null | "Pendiente" | "Aceptado" | "Denegado".</summary>
    public string? EstadoTesoreria { get; set; }
}
