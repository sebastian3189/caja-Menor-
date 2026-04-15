namespace CajaMenor.Application.DTOs;

public class CajaMenorDto
{
    public int Id { get; set; }
    public int CentralId { get; set; }
    public string CodigoCentral { get; set; } = string.Empty;
    public string NombreCentral { get; set; } = string.Empty;
    public string Nombre { get; set; } = string.Empty;
    public decimal ValorApertura { get; set; }
    public decimal Disponible { get; set; }
    public decimal TotalUsado { get; set; }
    public string NombreDirector { get; set; } = string.Empty;
    public string NombreAdministrador { get; set; } = string.Empty;
    public string Estado { get; set; } = string.Empty;
    public DateTime FechaApertura { get; set; }
}

public class CrearCajaMenorDto
{
    public int CentralId { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public decimal ValorApertura { get; set; }
    public int DirectorId { get; set; }
    public int AdministradorId { get; set; }
}

public class DashboardDto
{
    public CajaMenorDto Caja { get; set; } = null!;
    public ResumenAvancesDto Avances { get; set; } = null!;
    public ResumenLegalizacionesDto Legalizaciones { get; set; } = null!;
}
