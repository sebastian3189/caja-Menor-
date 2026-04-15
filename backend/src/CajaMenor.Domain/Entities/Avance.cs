using CajaMenor.Domain.Enums;

namespace CajaMenor.Domain.Entities;

public class Avance
{
    public int Id { get; set; }
    public int CajaId { get; set; }
    public string CodigoAvance { get; set; } = string.Empty;
    public DateTime FechaEnvio { get; set; }
    public decimal ValorAvance { get; set; }
    public string Descripcion { get; set; } = string.Empty;
    public string Solicitante { get; set; } = string.Empty;
    public EstadoAvance Estado { get; set; } = EstadoAvance.Pendiente;
    public TipoAvance? TipoAvance { get; set; }
    public EstadoReembolso EstadoReembolso { get; set; } = EstadoReembolso.SinReembolso;
    public DateTime FechaCreacion { get; set; } = DateTime.UtcNow;

    public CajaMenorEntity Caja { get; set; } = null!;
    public Legalizacion? Legalizacion { get; set; }
}
