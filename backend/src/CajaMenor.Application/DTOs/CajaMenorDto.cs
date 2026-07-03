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
    public int DirectorId { get; set; }
    public string NombreDirector { get; set; } = string.Empty;
    public List<int> AdministradorIds { get; set; } = [];
    public string NombreAdministrador { get; set; } = string.Empty;
    public string Estado { get; set; } = string.Empty;
    public DateTime FechaApertura { get; set; }
    /// <summary>Editable solo mientras la caja no tenga movimientos (TotalUsado = 0).</summary>
    public bool PuedeEditarApertura { get; set; }
    /// <summary>Eliminable solo si no tiene ningún movimiento registrado.</summary>
    public bool PuedeEliminar { get; set; }
}

public class CrearCajaMenorDto
{
    public int CentralId { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public decimal ValorApertura { get; set; }
    public int DirectorId { get; set; }
    public int AdministradorId { get; set; }
}

public class EditarCajaMenorDto
{
    public string Nombre { get; set; } = string.Empty;
    public int CentralId { get; set; }
    public decimal ValorApertura { get; set; }
    public int DirectorId { get; set; }
    /// <summary>0 = sin administrador asignado.</summary>
    public int AdministradorId { get; set; }
}

public class DashboardDto
{
    public CajaMenorDto Caja { get; set; } = null!;
    public ResumenAvancesDto Avances { get; set; } = null!;
    public ResumenLegalizacionesDto Legalizaciones { get; set; } = null!;
}
