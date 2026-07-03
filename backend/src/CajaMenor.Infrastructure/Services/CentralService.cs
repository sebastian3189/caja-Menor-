using CajaMenor.Application.Common;
using CajaMenor.Application.DTOs;
using CajaMenor.Application.Interfaces;
using CajaMenor.Domain.Entities;
using CajaMenor.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace CajaMenor.Infrastructure.Services;

public class CentralService(AppDbContext db) : ICentralService
{
    public async Task<Result<List<CentralDto>>> ListarAsync()
    {
        var centrales = await db.Centrales
            .Include(c => c.Usuarios)
            .Include(c => c.CajasMenores)
            .OrderBy(c => c.Nombre)
            .ToListAsync();

        var lista = centrales.Select(c => new CentralDto
        {
            Id = c.Id,
            Nombre = c.Nombre,
            CodigoCentral = c.CodigoCentral,
            TotalUsuarios = c.Usuarios.Count,
            TotalCajas = c.CajasMenores.Count
        }).ToList();

        return Result<List<CentralDto>>.Ok(lista);
    }

    public async Task<Result<CentralDto>> CrearAsync(CrearCentralDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Nombre))
            return Result<CentralDto>.Fail("El nombre es requerido.");

        if (string.IsNullOrWhiteSpace(dto.CodigoCentral))
            return Result<CentralDto>.Fail("El código es requerido.");

        var existe = await db.Centrales.AnyAsync(c =>
            c.CodigoCentral == dto.CodigoCentral.Trim().ToUpper());

        if (existe)
            return Result<CentralDto>.Fail($"Ya existe una central con el código '{dto.CodigoCentral}'.");

        var central = new Central
        {
            Nombre = dto.Nombre.Trim(),
            CodigoCentral = dto.CodigoCentral.Trim().ToUpper()
        };

        db.Centrales.Add(central);
        await db.SaveChangesAsync();

        return Result<CentralDto>.Ok(new CentralDto
        {
            Id = central.Id,
            Nombre = central.Nombre,
            CodigoCentral = central.CodigoCentral,
            TotalUsuarios = 0,
            TotalCajas = 0
        });
    }

    public async Task<Result<CentralDto>> EditarAsync(int id, EditarCentralDto dto)
    {
        var central = await db.Centrales
            .Include(c => c.Usuarios)
            .Include(c => c.CajasMenores)
            .FirstOrDefaultAsync(c => c.Id == id);

        if (central is null) return Result<CentralDto>.Fail("Central no encontrada.");

        if (string.IsNullOrWhiteSpace(dto.Nombre))
            return Result<CentralDto>.Fail("El nombre es requerido.");
        if (string.IsNullOrWhiteSpace(dto.CodigoCentral))
            return Result<CentralDto>.Fail("El código es requerido.");

        var codigoNuevo = dto.CodigoCentral.Trim().ToUpper();
        if (codigoNuevo != central.CodigoCentral)
        {
            var existe = await db.Centrales.AnyAsync(c => c.CodigoCentral == codigoNuevo && c.Id != id);
            if (existe) return Result<CentralDto>.Fail($"Ya existe una central con el código '{dto.CodigoCentral}'.");
        }

        central.Nombre = dto.Nombre.Trim();
        central.CodigoCentral = codigoNuevo;
        await db.SaveChangesAsync();

        return Result<CentralDto>.Ok(new CentralDto
        {
            Id = central.Id,
            Nombre = central.Nombre,
            CodigoCentral = central.CodigoCentral,
            TotalUsuarios = central.Usuarios.Count,
            TotalCajas = central.CajasMenores.Count
        });
    }

    public async Task<Result> EliminarAsync(int id)
    {
        var central = await db.Centrales
            .Include(c => c.Usuarios)
            .Include(c => c.CajasMenores)
            .FirstOrDefaultAsync(c => c.Id == id);

        if (central is null)
            return Result.Fail("Central no encontrada.");

        if (central.Usuarios.Count > 0)
            return Result.Fail("No se puede eliminar: la central tiene usuarios asignados.");

        if (central.CajasMenores.Count > 0)
            return Result.Fail("No se puede eliminar: la central tiene cajas menores asociadas.");

        db.Centrales.Remove(central);
        await db.SaveChangesAsync();

        return Result.Ok();
    }
}
