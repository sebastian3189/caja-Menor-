using CajaMenor.Application.Common;
using CajaMenor.Application.DTOs;
using CajaMenor.Application.Interfaces;
using CajaMenor.Domain.Entities;
using CajaMenor.Domain.Enums;
using CajaMenor.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace CajaMenor.Infrastructure.Services;

public class ArqueoService(AppDbContext db, INotificacionService notificacion, IConfiguration config) : IArqueoService
{
    public async Task<Result<ArqueoDto>> ObtenerArqueoActivoAsync(int cajaId)
    {
        var arqueo = await db.Arqueos.Include(a => a.Caja).FirstOrDefaultAsync(a => a.CajaId == cajaId && a.Estado != "Enviado");
        if (arqueo is null) return await GenerarArqueoAsync(cajaId);
        return Result<ArqueoDto>.Ok(await BuildArqueoDto(arqueo));
    }

    public async Task<Result<ArqueoDto>> GenerarArqueoAsync(int cajaId)
    {
        var caja = await db.CajasMenores.Include(c => c.Director).Include(c => c.Administradores).FirstOrDefaultAsync(c => c.Id == cajaId);
        if (caja is null) return Result<ArqueoDto>.Fail("Caja no encontrada");

        var resumen = await CalcularResumenAsync(cajaId);

        var arqueo = new Arqueo
        {
            CajaId = cajaId,
            FechaArqueo = DateTime.UtcNow,
            ValorApertura = caja.ValorApertura,
            DisponibleCaja = caja.Disponible,
            AvancesPendientesLegalizar = resumen.AvancesPendientesLegalizar,
            ValorAvancesPendientes = resumen.ValorAvancesPendientesLegalizar,
            LegalizacionesSinAvance = resumen.LegalizacionesSinAvance,
            ValorLegalizacionesSinAvance = resumen.ValorLegalizacionesSinAvance,
            ValorLegalizaciones = resumen.ValorLegalizacionesConAvance + resumen.ValorLegalizacionesSinAvance,
            TotalReembolso = resumen.ValorReembolsosSinReembolsar,
            Estado = "Pendiente"
        };

        db.Arqueos.Add(arqueo);
        await db.SaveChangesAsync();
        await db.Entry(arqueo).Reference(a => a.Caja).LoadAsync();

        return Result<ArqueoDto>.Ok(await BuildArqueoDto(arqueo));
    }

    public async Task<Result> SubirFirmaDirectivoAsync(int cajaId, string rutaFirma)
    {
        var arqueo = await ObtenerOCrearArqueoActivoAsync(cajaId);
        arqueo.RutaFirmaDirectivo = rutaFirma;
        await db.SaveChangesAsync();
        return Result.Ok();
    }

    public async Task<Result> SubirFirmaAdministradorAsync(int cajaId, string rutaFirma)
    {
        var arqueo = await ObtenerOCrearArqueoActivoAsync(cajaId);
        arqueo.RutaFirmaAdministrador = rutaFirma;
        await db.SaveChangesAsync();
        return Result.Ok();
    }

    public async Task<Result> EliminarFirmaDirectivoAsync(int cajaId)
    {
        var arqueo = await db.Arqueos.FirstOrDefaultAsync(a => a.CajaId == cajaId && a.Estado != "Enviado");
        if (arqueo is null) return Result.Fail("No hay arqueo activo");
        if (string.IsNullOrEmpty(arqueo.RutaFirmaDirectivo)) return Result.Fail("No hay firma del directivo registrada");
        if (System.IO.File.Exists(arqueo.RutaFirmaDirectivo))
            System.IO.File.Delete(arqueo.RutaFirmaDirectivo);
        arqueo.RutaFirmaDirectivo = null;
        await db.SaveChangesAsync();
        return Result.Ok();
    }

    public async Task<Result> EliminarFirmaAdministradorAsync(int cajaId)
    {
        var arqueo = await db.Arqueos.FirstOrDefaultAsync(a => a.CajaId == cajaId && a.Estado != "Enviado");
        if (arqueo is null) return Result.Fail("No hay arqueo activo");
        if (string.IsNullOrEmpty(arqueo.RutaFirmaAdministrador)) return Result.Fail("No hay firma del administrador registrada");
        if (System.IO.File.Exists(arqueo.RutaFirmaAdministrador))
            System.IO.File.Delete(arqueo.RutaFirmaAdministrador);
        arqueo.RutaFirmaAdministrador = null;
        await db.SaveChangesAsync();
        return Result.Ok();
    }

    public async Task<Result> EnviarATesoreriaAsync(int cajaId)
    {
        var arqueo = await db.Arqueos.Include(a => a.Caja).ThenInclude(c => c.Director)
            .Include(a => a.Caja).ThenInclude(c => c.Administradores)
            .FirstOrDefaultAsync(a => a.CajaId == cajaId && a.Estado != "Enviado");

        if (arqueo is null) return Result.Fail("No hay arqueo activo");
        if (string.IsNullOrEmpty(arqueo.RutaFirmaDirectivo)) return Result.Fail("Falta la firma del directivo");
        if (string.IsNullOrEmpty(arqueo.RutaFirmaAdministrador)) return Result.Fail("Falta la firma del administrador");

        var pdf = await GenerarPdfArqueoAsync(cajaId);
        if (!pdf.Success) return Result.Fail(pdf.Error!);

        // Token y enlaces Aceptar/Denegar que Tesorería usará desde el correo
        var token = Guid.NewGuid().ToString("N");
        var apiUrl = (config["App:ApiUrl"] ?? "http://localhost:5129").TrimEnd('/');
        var urlAceptar = $"{apiUrl}/api/tesoreria/{token}/aceptar";
        var urlDenegar = $"{apiUrl}/api/tesoreria/{token}/denegar";

        var emailTesoreria = config["Tesoreria:Email"] ?? "sliters83@gmail.com";
        var resultado = await notificacion.EnviarArqueoTesoreriaAsync(
            emailTesoreria,
            arqueo.Caja.Nombre,
            arqueo.Caja.Director.Nombre,
            string.Join(", ", arqueo.Caja.Administradores.Select(a => a.Nombre)),
            pdf.Data!,
            urlAceptar,
            urlDenegar);

        if (!resultado.Success) return resultado;

        arqueo.FechaEnvioTesoreria = DateTime.UtcNow;
        arqueo.Estado = "Enviado";
        arqueo.EstadoTesoreria = "Pendiente";
        arqueo.TokenTesoreria = token;
        arqueo.FechaRespuestaTesoreria = null;
        await db.SaveChangesAsync();
        return Result.Ok();
    }

    public async Task<Result<string>> ResponderTesoreriaAsync(string token, bool aceptar)
    {
        var arqueo = await db.Arqueos.FirstOrDefaultAsync(a => a.TokenTesoreria == token);
        if (arqueo is null)
            return Result<string>.Fail("Enlace inválido o el arqueo ya no existe.");

        if (arqueo.EstadoTesoreria is "Aceptado" or "Denegado")
            return Result<string>.Ok($"Este arqueo ya fue {arqueo.EstadoTesoreria.ToLower()} anteriormente.");

        arqueo.FechaRespuestaTesoreria = DateTime.UtcNow;

        if (aceptar)
        {
            arqueo.EstadoTesoreria = "Aceptado";
            await db.SaveChangesAsync();
            return Result<string>.Ok("Arqueo ACEPTADO. El Director ya puede confirmar el paso de los reembolsos al histórico.");
        }

        // Denegado: los reembolsos En Proceso de la caja vuelven a Sin Reembolso para rehacer el proceso
        arqueo.EstadoTesoreria = "Denegado";

        var reembolsos = await db.Reembolsos
            .Include(r => r.Legalizacion)
            .Where(r => r.Legalizacion.CajaId == arqueo.CajaId && r.Estado == EstadoReembolso.EnProceso)
            .ToListAsync();

        foreach (var r in reembolsos)
        {
            r.Estado = EstadoReembolso.SinReembolso;
            r.Legalizacion.EstadoReembolso = EstadoReembolso.SinReembolso;
        }

        var avanceIds = reembolsos.Where(r => r.AvanceId.HasValue).Select(r => r.AvanceId!.Value).ToList();
        var avances = await db.Avances.Where(a => avanceIds.Contains(a.Id)).ToListAsync();
        foreach (var a in avances) a.EstadoReembolso = EstadoReembolso.SinReembolso;

        await db.SaveChangesAsync();
        return Result<string>.Ok("Arqueo DENEGADO. Los reembolsos volvieron a 'Sin reembolso'; el equipo deberá corregir y reiniciar el proceso.");
    }

    public async Task<Result<byte[]>> GenerarPdfArqueoAsync(int cajaId)
    {
        var arqueo = await db.Arqueos.Include(a => a.Caja).ThenInclude(c => c.Director)
            .Include(a => a.Caja).ThenInclude(c => c.Administradores)
            .FirstOrDefaultAsync(a => a.CajaId == cajaId);

        if (arqueo is null) return Result<byte[]>.Fail("No hay arqueo para generar PDF");

        QuestPDF.Settings.License = LicenseType.Community;

        var pdf = Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(2, Unit.Centimetre);
                page.Content().Column(col =>
                {
                    col.Item().Text($"ARQUEO GENERAL CAJA MENOR").FontSize(16).Bold().AlignCenter();
                    col.Item().Text(arqueo.Caja.Nombre).FontSize(14).AlignCenter();
                    col.Item().Text($"Fecha: {arqueo.FechaArqueo:dd/MM/yyyy}").FontSize(10).AlignRight();
                    col.Item().PaddingTop(10).Table(table =>
                    {
                        table.ColumnsDefinition(columns =>
                        {
                            columns.RelativeColumn(3);
                            columns.RelativeColumn(2);
                        });
                        void Fila(string label, string valor)
                        {
                            table.Cell().Padding(4).Text(label).FontSize(10);
                            table.Cell().Padding(4).Text(valor).FontSize(10).AlignRight();
                        }
                        Fila("Valor Apertura:", $"${arqueo.ValorApertura:N0}");
                        Fila("Disponible en Caja:", $"${arqueo.DisponibleCaja:N0}");
                        Fila("Avances pendientes por legalizar:", $"${arqueo.ValorAvancesPendientes:N0}");
                        Fila("Legalizaciones sin avance:", $"${arqueo.ValorLegalizacionesSinAvance:N0}");
                        Fila("Valor en Legalizaciones:", $"${arqueo.ValorLegalizaciones:N0}");
                        Fila("TOTAL REEMBOLSO:", $"${arqueo.TotalReembolso:N0}");
                    });
                    col.Item().PaddingTop(20).Row(row =>
                    {
                        row.RelativeItem().Column(c =>
                        {
                            if (!string.IsNullOrEmpty(arqueo.RutaFirmaDirectivo) && System.IO.File.Exists(arqueo.RutaFirmaDirectivo))
                            {
                                var imgBytes = System.IO.File.ReadAllBytes(arqueo.RutaFirmaDirectivo);
                                c.Item().Height(60).AlignCenter().Image(imgBytes, ImageScaling.FitArea);
                            }
                            else
                            {
                                c.Item().Height(60).AlignCenter().Text("_______________________").AlignCenter();
                            }
                            c.Item().Text($"Director: {arqueo.Caja.Director.Nombre}").FontSize(9).AlignCenter();
                        });
                        row.RelativeItem().Column(c =>
                        {
                            if (!string.IsNullOrEmpty(arqueo.RutaFirmaAdministrador) && System.IO.File.Exists(arqueo.RutaFirmaAdministrador))
                            {
                                var imgBytes = System.IO.File.ReadAllBytes(arqueo.RutaFirmaAdministrador);
                                c.Item().Height(60).AlignCenter().Image(imgBytes, ImageScaling.FitArea);
                            }
                            else
                            {
                                c.Item().Height(60).AlignCenter().Text("_______________________").AlignCenter();
                            }
                            c.Item().Text($"Administrador: {string.Join(", ", arqueo.Caja.Administradores.Select(a => a.Nombre))}").FontSize(9).AlignCenter();
                        });
                    });
                });
            });
        });

        return Result<byte[]>.Ok(pdf.GeneratePdf());
    }

    private async Task<Arqueo> ObtenerOCrearArqueoActivoAsync(int cajaId)
    {
        var arqueo = await db.Arqueos.FirstOrDefaultAsync(a => a.CajaId == cajaId && a.Estado != "Enviado");
        if (arqueo is not null) return arqueo;

        arqueo = new Arqueo { CajaId = cajaId, FechaArqueo = DateTime.UtcNow, Estado = "Pendiente" };
        db.Arqueos.Add(arqueo);
        await db.SaveChangesAsync();
        return arqueo;
    }

    private async Task<ResumenMovimientosDto> CalcularResumenAsync(int cajaId)
    {
        var avances = await db.Avances.Where(a => a.CajaId == cajaId).ToListAsync();
        var legs = await db.Legalizaciones.Where(l => l.CajaId == cajaId).ToListAsync();
        var reembolsos = await db.Reembolsos.Include(r => r.Legalizacion).Where(r => r.Legalizacion.CajaId == cajaId).ToListAsync();

        return new ResumenMovimientosDto
        {
            AvancesPendientesLegalizar = avances.Count(a => a.Estado == EstadoAvance.Pendiente),
            ValorAvancesPendientesLegalizar = avances.Where(a => a.Estado == EstadoAvance.Pendiente).Sum(a => a.ValorAvance),
            AvancesPendientesReembolso = avances.Count(a => a.EstadoReembolso == EstadoReembolso.SinReembolso && a.Estado == EstadoAvance.Legalizado),
            ValorAvancesPendientesReembolso = avances.Where(a => a.EstadoReembolso == EstadoReembolso.SinReembolso && a.Estado == EstadoAvance.Legalizado).Sum(a => a.ValorAvance),
            LegalizacionesConAvance = legs.Count(l => l.AvanceId != null && l.EstadoReembolso != EstadoReembolso.Reembolsado),
            ValorLegalizacionesConAvance = legs.Where(l => l.AvanceId != null && l.EstadoReembolso != EstadoReembolso.Reembolsado).Sum(l => l.Monto),
            LegalizacionesSinAvance = legs.Count(l => l.AvanceId == null && l.EstadoReembolso != EstadoReembolso.Reembolsado),
            ValorLegalizacionesSinAvance = legs.Where(l => l.AvanceId == null && l.EstadoReembolso != EstadoReembolso.Reembolsado).Sum(l => l.Monto),
            ReembolsosSinReembolsar = reembolsos.Count(r => r.Estado != EstadoReembolso.Reembolsado),
            ValorReembolsosSinReembolsar = reembolsos.Where(r => r.Estado != EstadoReembolso.Reembolsado).Sum(r => r.Debemos)
        };
    }

    private async Task<ArqueoDto> BuildArqueoDto(Arqueo arqueo)
    {
        var resumen = await CalcularResumenAsync(arqueo.CajaId);
        var caja = await db.CajasMenores.FirstOrDefaultAsync(c => c.Id == arqueo.CajaId);

        // Actualizar campos del arqueo con valores en vivo
        arqueo.DisponibleCaja = caja?.Disponible ?? arqueo.DisponibleCaja;
        arqueo.AvancesPendientesLegalizar = resumen.AvancesPendientesLegalizar;
        arqueo.ValorAvancesPendientes = resumen.ValorAvancesPendientesLegalizar;
        arqueo.LegalizacionesSinAvance = resumen.LegalizacionesSinAvance;
        arqueo.ValorLegalizacionesSinAvance = resumen.ValorLegalizacionesSinAvance;
        arqueo.ValorLegalizaciones = resumen.ValorLegalizacionesConAvance + resumen.ValorLegalizacionesSinAvance;
        arqueo.TotalReembolso = resumen.ValorReembolsosSinReembolsar;
        await db.SaveChangesAsync();

        return new ArqueoDto
        {
            Id = arqueo.Id,
            CajaId = arqueo.CajaId,
            NombreCaja = arqueo.Caja?.Nombre ?? string.Empty,
            FechaArqueo = arqueo.FechaArqueo,
            ValorApertura = arqueo.ValorApertura,
            DisponibleCaja = arqueo.DisponibleCaja,
            AvancesPendientesLegalizar = arqueo.AvancesPendientesLegalizar,
            ValorAvancesPendientes = arqueo.ValorAvancesPendientes,
            LegalizacionesSinAvance = arqueo.LegalizacionesSinAvance,
            ValorLegalizacionesSinAvance = arqueo.ValorLegalizacionesSinAvance,
            ValorLegalizaciones = arqueo.ValorLegalizaciones,
            TotalReembolso = arqueo.TotalReembolso,
            TieneFirmaDirectivo = !string.IsNullOrEmpty(arqueo.RutaFirmaDirectivo),
            TieneFirmaAdministrador = !string.IsNullOrEmpty(arqueo.RutaFirmaAdministrador),
            RutaFirmaDirectivo = arqueo.RutaFirmaDirectivo,
            RutaFirmaAdministrador = arqueo.RutaFirmaAdministrador,
            FechaEnvioTesoreria = arqueo.FechaEnvioTesoreria,
            Estado = arqueo.Estado,
            ResumenMovimientos = resumen
        };
    }
}
