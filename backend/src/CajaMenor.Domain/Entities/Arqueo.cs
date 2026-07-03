namespace CajaMenor.Domain.Entities;

public class Arqueo
{
    public int Id { get; set; }
    public int CajaId { get; set; }
    public DateTime FechaArqueo { get; set; } = DateTime.UtcNow;
    public decimal ValorApertura { get; set; }
    public decimal DisponibleCaja { get; set; }
    public int AvancesPendientesLegalizar { get; set; }
    public decimal ValorAvancesPendientes { get; set; }
    public int LegalizacionesSinAvance { get; set; }
    public decimal ValorLegalizacionesSinAvance { get; set; }
    public decimal ValorLegalizaciones { get; set; }
    public decimal TotalReembolso { get; set; }
    public string? RutaFirmaDirectivo { get; set; }
    public string? RutaFirmaAdministrador { get; set; }
    public DateTime? FechaEnvioTesoreria { get; set; }
    public string Estado { get; set; } = "Pendiente";

    /// <summary>Respuesta de Tesorería al arqueo enviado: "Pendiente" | "Aceptado" | "Denegado".</summary>
    public string EstadoTesoreria { get; set; } = "Pendiente";
    /// <summary>Token único incluido en los enlaces Aceptar/Denegar del correo a Tesorería.</summary>
    public string? TokenTesoreria { get; set; }
    public DateTime? FechaRespuestaTesoreria { get; set; }

    public CajaMenorEntity Caja { get; set; } = null!;
}
