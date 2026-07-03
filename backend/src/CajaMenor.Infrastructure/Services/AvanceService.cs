using CajaMenor.Application.Common;
using CajaMenor.Application.DTOs;
using CajaMenor.Application.Interfaces;
using CajaMenor.Domain.Entities;
using CajaMenor.Domain.Enums;
using CajaMenor.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace CajaMenor.Infrastructure.Services;

public class AvanceService(AppDbContext db, INotificacionService notificacion, ILogger<AvanceService> logger) : IAvanceService
{
    public async Task<Result<List<AvanceDto>>> ObtenerPorCajaAsync(int cajaId)
    {
        var avances = await db.Avances
            .Include(a => a.Caja)
            .Where(a => a.CajaId == cajaId)
            .OrderByDescending(a => a.FechaEnvio)
            .Select(a => MapToDto(a))
            .ToListAsync();
        return Result<List<AvanceDto>>.Ok(avances);
    }

    public async Task<Result<AvanceDto>> ObtenerPorIdAsync(int id)
    {
        var avance = await db.Avances.Include(a => a.Caja).FirstOrDefaultAsync(a => a.Id == id);
        if (avance is null) return Result<AvanceDto>.Fail("Avance no encontrado");
        return Result<AvanceDto>.Ok(MapToDto(avance));
    }

    public async Task<Result<AvanceDto>> CrearAsync(CrearAvanceDto dto)
    {
        var existe = await db.Avances.AnyAsync(a => a.CodigoAvance == dto.CodigoAvance);
        if (existe) return Result<AvanceDto>.Fail($"Ya existe un avance con código {dto.CodigoAvance}");

        var caja = await db.CajasMenores.FindAsync(dto.CajaId);
        if (caja is null) return Result<AvanceDto>.Fail("Caja no encontrada");
        if (caja.Disponible < dto.ValorAvance)
            return Result<AvanceDto>.Fail($"Saldo insuficiente. Disponible: {caja.Disponible:C}");
        if (caja.TotalUsado + dto.ValorAvance > caja.ValorApertura)
            return Result<AvanceDto>.Fail($"El avance supera el tope de la caja. Tope: {caja.ValorApertura:C}, ya usado: {caja.TotalUsado:C}");

        var avance = new Avance
        {
            CajaId = dto.CajaId,
            CodigoAvance = dto.CodigoAvance,
            FechaEnvio = dto.FechaEnvio,
            ValorAvance = dto.ValorAvance,
            Descripcion = dto.Descripcion,
            Solicitante = dto.Solicitante,
            Estado = EstadoAvance.Pendiente,
            EstadoReembolso = EstadoReembolso.SinReembolso
        };

        // Descontar el valor del avance del disponible de la caja
        caja.Disponible -= dto.ValorAvance;
        caja.TotalUsado += dto.ValorAvance;

        db.Avances.Add(avance);
        await db.SaveChangesAsync();

        await db.Entry(avance).Reference(a => a.Caja).LoadAsync();

        // Enviar el documento del avance al solicitante para su firma/validación (no bloquea la creación si falla)
        await EnviarDocumentoAlSolicitanteAsync(avance);

        return Result<AvanceDto>.Ok(MapToDto(avance));
    }

    /// <summary>
    /// Envía el PDF del avance al correo del solicitante (para firma y validación de la entrega).
    /// Resuelve el correo emparejando el nombre del solicitante con los solicitantes de la caja.
    /// Es best-effort: cualquier fallo se registra pero no interrumpe la creación del avance.
    /// </summary>
    private async Task EnviarDocumentoAlSolicitanteAsync(Avance avance)
    {
        try
        {
            var solicitante = await db.UsuariosApp
                .FirstOrDefaultAsync(u => u.Nombre == avance.Solicitante
                                          && u.CajasMenoresComoSolicitante.Any(c => c.Id == avance.CajaId));

            if (solicitante is null || string.IsNullOrWhiteSpace(solicitante.Email))
            {
                logger.LogInformation("Avance {Codigo}: no se encontró correo del solicitante '{Solicitante}'; no se envió el documento.",
                    avance.CodigoAvance, avance.Solicitante);
                return;
            }

            var pdf = await GenerarPdfAsync(avance.Id);
            if (!pdf.Success)
            {
                logger.LogWarning("Avance {Codigo}: no se pudo generar el PDF para el envío ({Error}).", avance.CodigoAvance, pdf.Error);
                return;
            }

            var envio = await notificacion.EnviarAvanceSolicitanteAsync(
                solicitante.Email, solicitante.Nombre, avance.CodigoAvance, avance.ValorAvance, pdf.Data!);
            if (!envio.Success)
                logger.LogError("Avance {Codigo}: fallo al enviar el documento a {Email}: {Error}", avance.CodigoAvance, solicitante.Email, envio.Error);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Avance {Codigo}: error inesperado al enviar el documento al solicitante.", avance.CodigoAvance);
        }
    }

    public async Task<Result<ResumenAvancesDto>> ObtenerResumenAsync(int cajaId)
    {
        var avances = await db.Avances.Where(a => a.CajaId == cajaId).ToListAsync();
        var total = avances.Count;
        var pendientes = avances.Count(a => a.Estado == EstadoAvance.Pendiente);
        var legalizados = avances.Count(a => a.Estado == EstadoAvance.Legalizado);

        return Result<ResumenAvancesDto>.Ok(new ResumenAvancesDto
        {
            Total = total,
            Pendientes = pendientes,
            Legalizados = legalizados,
            PorcentajePendientes = total > 0 ? Math.Round((decimal)pendientes / total * 100, 1) : 0,
            PorcentajeLegalizados = total > 0 ? Math.Round((decimal)legalizados / total * 100, 1) : 0
        });
    }

    public async Task<Result<List<AvanceDto>>> ObtenerPendientesAsync(int cajaId)
    {
        var avances = await db.Avances
            .Include(a => a.Caja)
            .Where(a => a.CajaId == cajaId && a.Estado == EstadoAvance.Pendiente)
            .Select(a => MapToDto(a))
            .ToListAsync();
        return Result<List<AvanceDto>>.Ok(avances);
    }

    public async Task<Result<AvanceDto>> EditarAsync(int id, EditarAvanceDto dto)
    {
        var avance = await db.Avances.Include(a => a.Caja).FirstOrDefaultAsync(a => a.Id == id);
        if (avance is null) return Result<AvanceDto>.Fail("Avance no encontrado");

        // Verificar código duplicado (si cambió)
        if (avance.CodigoAvance != dto.CodigoAvance)
        {
            var existe = await db.Avances.AnyAsync(a => a.CodigoAvance == dto.CodigoAvance && a.Id != id);
            if (existe) return Result<AvanceDto>.Fail($"Ya existe un avance con código {dto.CodigoAvance}");
        }

        // Valor solo editable si está Pendiente
        if (avance.Estado == EstadoAvance.Pendiente && avance.ValorAvance != dto.ValorAvance)
        {
            var delta = dto.ValorAvance - avance.ValorAvance;
            var caja = avance.Caja;
            if (delta > 0 && caja.Disponible < delta)
                return Result<AvanceDto>.Fail($"Saldo insuficiente. Disponible: {caja.Disponible:C}");
            if (delta > 0 && caja.TotalUsado + delta > caja.ValorApertura)
                return Result<AvanceDto>.Fail($"El nuevo valor supera el tope de la caja. Tope: {caja.ValorApertura:C}, ya usado: {caja.TotalUsado:C}");

            caja.Disponible -= delta;
            caja.TotalUsado += delta;
            avance.ValorAvance = dto.ValorAvance;
        }

        avance.CodigoAvance = dto.CodigoAvance;
        avance.FechaEnvio = dto.FechaEnvio;
        avance.Descripcion = dto.Descripcion;
        avance.Solicitante = dto.Solicitante;

        await db.SaveChangesAsync();
        return Result<AvanceDto>.Ok(MapToDto(avance));
    }

    public async Task<Result<string>> ObtenerSiguienteCodigoAsync(int cajaId)
    {
        var ultimo = await db.Avances
            .Where(a => a.CajaId == cajaId)
            .OrderByDescending(a => a.Id)
            .Select(a => a.CodigoAvance)
            .FirstOrDefaultAsync();

        int siguiente = 1;
        if (ultimo is not null && ultimo.Contains('-'))
        {
            var partes = ultimo.Split('-');
            if (int.TryParse(partes[^1], out var num)) siguiente = num + 1;
        }
        return Result<string>.Ok($"REQ-{siguiente:D4}");
    }

    public async Task<Result> EliminarAsync(int id)
    {
        var avance = await db.Avances.Include(a => a.Caja).FirstOrDefaultAsync(a => a.Id == id);
        if (avance is null) return Result.Fail("Avance no encontrado");
        if (avance.Estado != EstadoAvance.Pendiente)
            return Result.Fail("Solo se pueden eliminar avances en estado Pendiente");

        // Desvincular cualquier solicitud que apunte a este avance (FK NoAction)
        var solicitudesLigadas = await db.SolicitudesAvance.Where(s => s.AvanceId == id).ToListAsync();
        foreach (var s in solicitudesLigadas) s.AvanceId = null;

        avance.Caja.Disponible += avance.ValorAvance;
        avance.Caja.TotalUsado -= avance.ValorAvance;

        db.Avances.Remove(avance);
        await db.SaveChangesAsync();
        return Result.Ok();
    }

    public async Task<Result<byte[]>> GenerarPdfAsync(int id)
    {
        var avance = await db.Avances
            .Include(a => a.Caja).ThenInclude(c => c.Central)
            .Include(a => a.Caja).ThenInclude(c => c.Director)
            .Include(a => a.Caja).ThenInclude(c => c.Administradores)
            .FirstOrDefaultAsync(a => a.Id == id);
        if (avance is null) return Result<byte[]>.Fail("Avance no encontrado");

        QuestPDF.Settings.License = LicenseType.Community;
        var caja = avance.Caja;
        var administrador = string.Join(", ", caja.Administradores.Select(a => a.Nombre));

        var pdf = Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(2, Unit.Centimetre);
                page.Header().Column(h =>
                {
                    h.Item().Text("COMPROBANTE DE AVANCE DE CAJA MENOR").FontSize(16).Bold().AlignCenter();
                    h.Item().Text(caja.Nombre).FontSize(12).AlignCenter();
                    h.Item().Text($"Central: {caja.Central?.Nombre ?? "—"}").FontSize(9).AlignCenter().FontColor(Colors.Grey.Darken1);
                });
                page.Content().PaddingVertical(15).Column(col =>
                {
                    col.Item().PaddingBottom(6).Row(r =>
                    {
                        r.RelativeItem().Text($"Código: {avance.CodigoAvance}").FontSize(11).Bold();
                        r.RelativeItem().AlignRight().Text($"Fecha: {avance.FechaEnvio:dd/MM/yyyy}").FontSize(10);
                    });
                    col.Item().PaddingTop(6).Table(table =>
                    {
                        table.ColumnsDefinition(columns => { columns.RelativeColumn(2); columns.RelativeColumn(3); });
                        void Fila(string label, string valor)
                        {
                            table.Cell().Background(Colors.Grey.Lighten3).Padding(6).Text(label).FontSize(10).Bold();
                            table.Cell().Padding(6).Text(valor).FontSize(10);
                        }
                        Fila("Solicitante", avance.Solicitante);
                        Fila("Valor del avance", $"${avance.ValorAvance:N0}");
                        Fila("Descripción", avance.Descripcion);
                        Fila("Estado", avance.Estado.ToString());
                        Fila("Estado de reembolso", avance.EstadoReembolso.ToString());
                    });
                    col.Item().PaddingTop(50).Row(row =>
                    {
                        row.RelativeItem().Column(c =>
                        {
                            c.Item().Text("_______________________").AlignCenter();
                            c.Item().Text($"Administrador: {administrador}").FontSize(9).AlignCenter();
                        });
                        row.RelativeItem().Column(c =>
                        {
                            c.Item().Text("_______________________").AlignCenter();
                            c.Item().Text($"Director: {caja.Director?.Nombre ?? "—"}").FontSize(9).AlignCenter();
                        });
                    });
                });
                page.Footer().AlignCenter().Text(t =>
                {
                    t.Span("Generado el ").FontSize(8).FontColor(Colors.Grey.Medium);
                    t.Span($"{DateTime.Now:dd/MM/yyyy HH:mm}").FontSize(8).FontColor(Colors.Grey.Medium);
                });
            });
        });

        return Result<byte[]>.Ok(pdf.GeneratePdf());
    }

    private static AvanceDto MapToDto(Avance a) => new()
    {
        Id = a.Id,
        CajaId = a.CajaId,
        CodigoAvance = a.CodigoAvance,
        FechaEnvio = a.FechaEnvio,
        ValorAvance = a.ValorAvance,
        Descripcion = a.Descripcion,
        Solicitante = a.Solicitante,
        Estado = a.Estado.ToString(),
        TipoAvance = a.TipoAvance?.ToString(),
        EstadoReembolso = a.EstadoReembolso.ToString(),
        NombreCaja = a.Caja?.Nombre ?? string.Empty
    };
}
