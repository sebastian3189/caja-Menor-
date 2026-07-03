using CajaMenor.Application.Common;
using CajaMenor.Application.DTOs;
using CajaMenor.Application.Interfaces;
using CajaMenor.Domain.Enums;
using CajaMenor.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace CajaMenor.Infrastructure.Services;

public class ReembolsoService(AppDbContext db) : IReembolsoService
{
    public async Task<Result<ResumenReembolsosDto>> ObtenerPorCajaAsync(int cajaId)
    {
        var reembolsos = await db.Reembolsos
            .Include(r => r.Legalizacion).ThenInclude(l => l.Avance)
            .Where(r => r.Legalizacion.CajaId == cajaId)
            .ToListAsync();

        var sinReembolso = reembolsos.Where(r => r.Estado == EstadoReembolso.SinReembolso || r.Estado == EstadoReembolso.EnProceso).ToList();
        var historico = reembolsos.Where(r => r.Estado == EstadoReembolso.Reembolsado).ToList();

        return Result<ResumenReembolsosDto>.Ok(new ResumenReembolsosDto
        {
            SinReembolso = sinReembolso.Select(MapToDto).ToList(),
            TotalPendiente = sinReembolso.Sum(r => r.Debemos),
            Historico = historico.Select(MapToDto).ToList(),
            EstadoTesoreria = await ObtenerEstadoTesoreriaAsync(cajaId)
        });
    }

    /// <summary>Estado de Tesorería del último arqueo enviado de la caja (null si nunca se envió uno).</summary>
    private async Task<string?> ObtenerEstadoTesoreriaAsync(int cajaId)
    {
        return await db.Arqueos
            .Where(a => a.CajaId == cajaId && a.TokenTesoreria != null)
            .OrderByDescending(a => a.Id)
            .Select(a => a.EstadoTesoreria)
            .FirstOrDefaultAsync();
    }

    public async Task<Result> ActivarReembolsosAsync(int cajaId)
    {
        var reembolsos = await db.Reembolsos
            .Include(r => r.Legalizacion)
            .Where(r => r.Legalizacion.CajaId == cajaId && r.Estado == EstadoReembolso.SinReembolso)
            .ToListAsync();

        if (!reembolsos.Any()) return Result.Fail("No hay reembolsos pendientes para activar");

        foreach (var r in reembolsos)
        {
            r.Estado = EstadoReembolso.EnProceso;
            r.Legalizacion.EstadoReembolso = EstadoReembolso.EnProceso;
        }

        // Actualizar avances asociados
        var avanceIds = reembolsos.Where(r => r.AvanceId.HasValue).Select(r => r.AvanceId!.Value).ToList();
        var avances = await db.Avances.Where(a => avanceIds.Contains(a.Id)).ToListAsync();
        foreach (var a in avances) a.EstadoReembolso = EstadoReembolso.EnProceso;

        await db.SaveChangesAsync();
        return Result.Ok();
    }

    public async Task<Result> ConfirmarReembolsosAsync(int cajaId)
    {
        // Solo se puede pasar a histórico si Tesorería aceptó el arqueo enviado
        var estadoTesoreria = await ObtenerEstadoTesoreriaAsync(cajaId);
        if (estadoTesoreria != "Aceptado")
            return Result.Fail(estadoTesoreria == "Denegado"
                ? "Tesorería denegó el arqueo. Corrija y reinicie el proceso antes de confirmar."
                : "Tesorería aún no ha aceptado el arqueo. Espere su aprobación desde el correo.");

        var reembolsos = await db.Reembolsos
            .Include(r => r.Legalizacion)
            .Where(r => r.Legalizacion.CajaId == cajaId && r.Estado == EstadoReembolso.EnProceso)
            .ToListAsync();

        if (!reembolsos.Any()) return Result.Fail("No hay reembolsos en proceso para confirmar");

        var caja = await db.CajasMenores.FirstOrDefaultAsync(c => c.Id == cajaId);
        if (caja is null) return Result.Fail("Caja no encontrada");

        var totalReintegro = reembolsos.Sum(r => r.Debemos);

        foreach (var r in reembolsos)
        {
            r.Estado = EstadoReembolso.Reembolsado;
            r.FechaConfirmacion = DateTime.UtcNow;
            r.Legalizacion.EstadoReembolso = EstadoReembolso.Reembolsado;
        }

        var avanceIds = reembolsos.Where(r => r.AvanceId.HasValue).Select(r => r.AvanceId!.Value).ToList();
        var avances = await db.Avances.Where(a => avanceIds.Contains(a.Id)).ToListAsync();
        foreach (var a in avances) a.EstadoReembolso = EstadoReembolso.Reembolsado;

        // Reintegrar el monto a la caja
        caja.Disponible += totalReintegro;
        if (caja.TotalUsado >= totalReintegro)
            caja.TotalUsado -= totalReintegro;

        await db.SaveChangesAsync();
        return Result.Ok();
    }

    public async Task<Result> CancelarAsync(int reembolsoId)
    {
        var reembolso = await db.Reembolsos
            .Include(r => r.Legalizacion)
            .FirstOrDefaultAsync(r => r.Id == reembolsoId);

        if (reembolso is null) return Result.Fail("Reembolso no encontrado");
        if (reembolso.Estado != EstadoReembolso.SinReembolso)
            return Result.Fail("Solo se pueden cancelar reembolsos en estado 'Sin Reembolso'");

        // Revertir estado de la legalización
        reembolso.Legalizacion.EstadoReembolso = EstadoReembolso.SinReembolso;

        // Revertir estado del avance si aplica
        if (reembolso.AvanceId.HasValue)
        {
            var avance = await db.Avances.FindAsync(reembolso.AvanceId.Value);
            if (avance is not null) avance.EstadoReembolso = EstadoReembolso.SinReembolso;
        }

        db.Reembolsos.Remove(reembolso);
        await db.SaveChangesAsync();
        return Result.Ok();
    }

    private static ReembolsoDto MapToDto(Domain.Entities.Reembolso r) => new()
    {
        Id = r.Id,
        LegalizacionId = r.LegalizacionId,
        CodigoLegalizacion = r.Legalizacion?.CodigoLegalizacion ?? string.Empty,
        AvanceId = r.AvanceId,
        CodigoAvance = r.Legalizacion?.Avance?.CodigoAvance,
        CodigoCentral = r.CodigoCentral,
        ValorAvance = r.ValorAvance,
        ValorLegalizado = r.ValorLegalizado,
        Debe = r.Debe,
        Debemos = r.Debemos,
        Monto = r.Monto,
        Estado = r.Estado.ToString(),
        FechaReembolso = r.FechaReembolso,
        FechaConfirmacion = r.FechaConfirmacion
    };
}
