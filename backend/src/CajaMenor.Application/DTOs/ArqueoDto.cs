namespace CajaMenor.Application.DTOs;

public class ArqueoDto
{
    public int Id { get; set; }
    public int CajaId { get; set; }
    public string NombreCaja { get; set; } = string.Empty;
    public DateTime FechaArqueo { get; set; }
    public decimal ValorApertura { get; set; }
    public decimal DisponibleCaja { get; set; }
    public int AvancesPendientesLegalizar { get; set; }
    public decimal ValorAvancesPendientes { get; set; }
    public int LegalizacionesSinAvance { get; set; }
    public decimal ValorLegalizacionesSinAvance { get; set; }
    public decimal ValorLegalizaciones { get; set; }
    public decimal TotalReembolso { get; set; }
    public bool TieneFirmaDirectivo { get; set; }
    public bool TieneFirmaAdministrador { get; set; }
    public string? RutaFirmaDirectivo { get; set; }
    public string? RutaFirmaAdministrador { get; set; }
    public DateTime? FechaEnvioTesoreria { get; set; }
    public string Estado { get; set; } = string.Empty;
    public ResumenMovimientosDto ResumenMovimientos { get; set; } = null!;
}

public class ResumenMovimientosDto
{
    public int AvancesPendientesLegalizar { get; set; }
    public decimal ValorAvancesPendientesLegalizar { get; set; }
    public int AvancesPendientesReembolso { get; set; }
    public decimal ValorAvancesPendientesReembolso { get; set; }
    public int LegalizacionesConAvance { get; set; }
    public decimal ValorLegalizacionesConAvance { get; set; }
    public int LegalizacionesSinAvance { get; set; }
    public decimal ValorLegalizacionesSinAvance { get; set; }
    public int ReembolsosSinReembolsar { get; set; }
    public decimal ValorReembolsosSinReembolsar { get; set; }
}
