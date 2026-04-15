using CajaMenor.Application.Common;
using CajaMenor.Application.DTOs;
using CajaMenor.Application.Interfaces;
using CajaMenor.Domain.Entities;
using CajaMenor.Domain.Enums;
using CajaMenor.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace CajaMenor.Infrastructure.Services;

public class AvanceService(AppDbContext db) : IAvanceService
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
        return Result<AvanceDto>.Ok(MapToDto(avance));
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
