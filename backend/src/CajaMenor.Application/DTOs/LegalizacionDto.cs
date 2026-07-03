using CajaMenor.Domain.Enums;

namespace CajaMenor.Application.DTOs;

public class ReciboDto
{
    public int Id { get; set; }
    public string NombreOriginal { get; set; } = string.Empty;
    public string Url { get; set; } = string.Empty;
    public DateTime FechaSubida { get; set; }
    public decimal? ValorOCR { get; set; }
    public bool ValidadoOCR { get; set; }
    public string? NotaOCR { get; set; }
}

public class LegalizacionDto
{
    public int Id { get; set; }
    public int CajaId { get; set; }
    public string CodigoLegalizacion { get; set; } = string.Empty;
    public decimal Monto { get; set; }
    public string Descripcion { get; set; } = string.Empty;
    public string TipoLegalizacion { get; set; } = string.Empty;
    public DateTime FechaLegalizacion { get; set; }
    public int? AvanceId { get; set; }
    public string? CodigoAvance { get; set; }
    public decimal ValorAvance { get; set; }
    public decimal Diferencia { get; set; }
    public decimal DescuentoCaja { get; set; }
    public decimal ValorReembolsar { get; set; }
    public string EstadoReembolso { get; set; } = string.Empty;
    public string NombreCaja { get; set; } = string.Empty;
    public bool ReembolsoFinalizado { get; set; }
    public List<ReciboDto> Recibos { get; set; } = new();
}

public class CrearLegalizacionDto
{
    public int CajaId { get; set; }
    public string CodigoLegalizacion { get; set; } = string.Empty;
    public decimal Monto { get; set; }
    public string Descripcion { get; set; } = string.Empty;
    public string TipoLegalizacion { get; set; } = string.Empty;
    public DateTime FechaLegalizacion { get; set; }
    public int? AvanceId { get; set; }
}

public class EditarLegalizacionDto
{
    public string CodigoLegalizacion { get; set; } = string.Empty;
    public DateTime FechaLegalizacion { get; set; }
    public decimal Monto { get; set; }
    public string Descripcion { get; set; } = string.Empty;
    public string TipoLegalizacion { get; set; } = string.Empty;
}

public class ResumenLegalizacionesDto
{
    public int Total { get; set; }
    public int SinAvance { get; set; }
    public int ConAvance { get; set; }
    /// <summary>Legalizaciones ya reembolsadas (histórico); en el dashboard se excluyen de Total/SinAvance/ConAvance.</summary>
    public int Reembolsadas { get; set; }
    public decimal ValorReembolsadas { get; set; }
}
