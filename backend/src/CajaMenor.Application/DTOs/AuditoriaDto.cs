namespace CajaMenor.Application.DTOs;

public class AuditoriaDto
{
    public int Id { get; set; }
    public string Tabla { get; set; } = string.Empty;
    public int RegistroId { get; set; }
    public string Usuario { get; set; } = string.Empty;
    public string Accion { get; set; } = string.Empty;
    public DateTime Fecha { get; set; }
    public string? DatosAnteriores { get; set; }
    public string? DatosNuevos { get; set; }
}
