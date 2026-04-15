using CajaMenor.Domain.Enums;

namespace CajaMenor.Domain.Entities;

public class Legalizacion
{
    public int Id { get; set; }
    public int CajaId { get; set; }
    public string CodigoLegalizacion { get; set; } = string.Empty;
    public decimal Monto { get; set; }
    public string Descripcion { get; set; } = string.Empty;
    public string TipoLegalizacion { get; set; } = string.Empty;
    public DateTime FechaLegalizacion { get; set; }
    public int? AvanceId { get; set; }
    public decimal ValorAvance { get; set; }
    public decimal Diferencia { get; set; }
    public decimal DescuentoCaja { get; set; }
    public decimal ValorReembolsar { get; set; }
    public EstadoReembolso EstadoReembolso { get; set; } = EstadoReembolso.SinReembolso;
    public DateTime FechaCreacion { get; set; } = DateTime.UtcNow;

    public CajaMenorEntity Caja { get; set; } = null!;
    public Avance? Avance { get; set; }
    public Reembolso? Reembolso { get; set; }
    public ICollection<LegalizacionRecibo> Recibos { get; set; } = new List<LegalizacionRecibo>();

    public void CalcularDiferencias()
    {
        if (AvanceId == null)
        {
            // Sin avance: reembolsar el monto completo
            Diferencia = 0;
            DescuentoCaja = 0;
            ValorReembolsar = Monto;
            return;
        }

        // Diferencia = V.Avance - Monto
        // Positiva → Sobrante (gastó menos, empleado devuelve exceso)
        // Negativa → Faltante (gastó más, se registra en DescuentoCaja)
        // Cero    → Total
        Diferencia = ValorAvance - Monto;
        DescuentoCaja = Diferencia < 0 ? Math.Abs(Diferencia) : 0;
        ValorReembolsar = Monto; // Siempre se reembolsa el monto legalizado
    }
}
