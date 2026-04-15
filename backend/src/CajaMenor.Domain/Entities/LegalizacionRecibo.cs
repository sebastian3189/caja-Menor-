namespace CajaMenor.Domain.Entities;

public class LegalizacionRecibo
{
    public int Id { get; set; }
    public int LegalizacionId { get; set; }
    public string NombreOriginal { get; set; } = string.Empty;
    public string RutaArchivo { get; set; } = string.Empty;
    public DateTime FechaSubida { get; set; } = DateTime.UtcNow;

    public Legalizacion Legalizacion { get; set; } = null!;
}
