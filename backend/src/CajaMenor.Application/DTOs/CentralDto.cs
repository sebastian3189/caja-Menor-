namespace CajaMenor.Application.DTOs;

public class CentralDto
{
    public int Id { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string CodigoCentral { get; set; } = string.Empty;
    public int TotalUsuarios { get; set; }
    public int TotalCajas { get; set; }
}

public class CrearCentralDto
{
    public string Nombre { get; set; } = string.Empty;
    public string CodigoCentral { get; set; } = string.Empty;
}

public class EditarCentralDto
{
    public string Nombre { get; set; } = string.Empty;
    public string CodigoCentral { get; set; } = string.Empty;
}
