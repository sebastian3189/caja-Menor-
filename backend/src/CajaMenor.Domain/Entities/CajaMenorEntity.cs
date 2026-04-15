using CajaMenor.Domain.Enums;

namespace CajaMenor.Domain.Entities;

public class CajaMenorEntity
{
    public int Id { get; set; }
    public int CentralId { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public decimal ValorApertura { get; set; }
    public decimal Disponible { get; set; }
    public decimal TotalUsado { get; set; }
    public int DirectorId { get; set; }
    public EstadoCaja Estado { get; set; } = EstadoCaja.Abierta;
    public DateTime FechaApertura { get; set; } = DateTime.UtcNow;

    public Central Central { get; set; } = null!;
    public UsuarioApp Director { get; set; } = null!;
    public ICollection<UsuarioApp> Administradores { get; set; } = [];
    public ICollection<Avance> Avances { get; set; } = [];
    public ICollection<Legalizacion> Legalizaciones { get; set; } = [];
    public ICollection<Arqueo> Arqueos { get; set; } = [];
}
