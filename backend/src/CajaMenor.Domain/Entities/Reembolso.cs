using CajaMenor.Domain.Enums;

namespace CajaMenor.Domain.Entities;

public class Reembolso
{
    public int Id { get; set; }
    public int LegalizacionId { get; set; }
    public int? AvanceId { get; set; }
    public string CodigoCentral { get; set; } = string.Empty;
    public decimal ValorAvance { get; set; }
    public decimal ValorLegalizado { get; set; }
    public decimal Debe { get; set; }
    public decimal Debemos { get; set; }
    public decimal Monto { get; set; }
    public EstadoReembolso Estado { get; set; } = EstadoReembolso.SinReembolso;
    public DateTime FechaReembolso { get; set; }
    public DateTime? FechaConfirmacion { get; set; }

    public Legalizacion Legalizacion { get; set; } = null!;
}
