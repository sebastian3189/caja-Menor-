namespace CajaMenor.Domain.Entities;

public class AuditLog
{
    public int Id { get; set; }
    public string Tabla { get; set; } = string.Empty;
    public int RegistroId { get; set; }
    public string UsuarioId { get; set; } = string.Empty;
    public string Accion { get; set; } = string.Empty;
    public DateTime Fecha { get; set; } = DateTime.UtcNow;
    public string? DatosAnteriores { get; set; }
    public string? DatosNuevos { get; set; }
}
