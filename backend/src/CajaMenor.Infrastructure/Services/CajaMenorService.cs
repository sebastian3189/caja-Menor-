using CajaMenor.Application.Common;
using CajaMenor.Application.DTOs;
using CajaMenor.Application.Interfaces;
using CajaMenor.Domain.Entities;
using CajaMenor.Domain.Enums;
using CajaMenor.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace CajaMenor.Infrastructure.Services;

public class CajaMenorService(AppDbContext db) : ICajaMenorService
{
    public async Task<Result<CajaMenorDto>> ObtenerPorUsuarioAsync(string identityUserId)
    {
        var usuario = await db.UsuariosApp.FirstOrDefaultAsync(u => u.IdentityUserId == identityUserId);
        if (usuario is null) return Result<CajaMenorDto>.Fail("Usuario no encontrado");

        var caja = await db.CajasMenores
            .Include(c => c.Central)
            .Include(c => c.Director)
            .Include(c => c.Administradores)
            .FirstOrDefaultAsync(c => c.DirectorId == usuario.Id || c.Administradores.Any(a => a.Id == usuario.Id));

        if (caja is null) return Result<CajaMenorDto>.Fail("No tiene una caja asignada");
        return Result<CajaMenorDto>.Ok(MapToDto(caja));
    }

    public async Task<Result<CajaMenorDto>> CrearAsync(CrearCajaMenorDto dto)
    {
        var caja = new CajaMenorEntity
        {
            CentralId = dto.CentralId,
            Nombre = dto.Nombre,
            ValorApertura = dto.ValorApertura,
            Disponible = dto.ValorApertura,
            TotalUsado = 0,
            DirectorId = dto.DirectorId,
            Estado = EstadoCaja.Abierta,
            FechaApertura = DateTime.UtcNow
        };

        if (dto.AdministradorId > 0)
        {
            var admin = await db.UsuariosApp.FindAsync(dto.AdministradorId);
            if (admin is not null) caja.Administradores.Add(admin);
        }

        db.CajasMenores.Add(caja);
        await db.SaveChangesAsync();
        await db.Entry(caja).Reference(c => c.Central).LoadAsync();
        await db.Entry(caja).Reference(c => c.Director).LoadAsync();
        await db.Entry(caja).Collection(c => c.Administradores).LoadAsync();
        return Result<CajaMenorDto>.Ok(MapToDto(caja));
    }

    public async Task<Result<DashboardDto>> ObtenerDashboardAsync(int cajaId)
    {
        var caja = await db.CajasMenores
            .Include(c => c.Central)
            .Include(c => c.Director)
            .Include(c => c.Administradores)
            .FirstOrDefaultAsync(c => c.Id == cajaId);

        if (caja is null) return Result<DashboardDto>.Fail("Caja no encontrada");

        var avances = await db.Avances.Where(a => a.CajaId == cajaId).ToListAsync();
        var legs = await db.Legalizaciones.Where(l => l.CajaId == cajaId).ToListAsync();

        var totalAvances = avances.Count;
        var pendientes = avances.Count(a => a.Estado == EstadoAvance.Pendiente);
        var legalizados = avances.Count(a => a.Estado == EstadoAvance.Legalizado);

        return Result<DashboardDto>.Ok(new DashboardDto
        {
            Caja = MapToDto(caja),
            Avances = new ResumenAvancesDto
            {
                Total = totalAvances,
                Pendientes = pendientes,
                Legalizados = legalizados,
                PorcentajePendientes = totalAvances > 0 ? Math.Round((decimal)pendientes / totalAvances * 100, 1) : 0,
                PorcentajeLegalizados = totalAvances > 0 ? Math.Round((decimal)legalizados / totalAvances * 100, 1) : 0
            },
            Legalizaciones = new ResumenLegalizacionesDto
            {
                Total = legs.Count,
                SinAvance = legs.Count(l => l.AvanceId == null),
                ConAvance = legs.Count(l => l.AvanceId != null)
            }
        });
    }

    private static CajaMenorDto MapToDto(CajaMenorEntity c) => new()
    {
        Id = c.Id,
        CentralId = c.CentralId,
        CodigoCentral = c.Central?.CodigoCentral ?? string.Empty,
        NombreCentral = c.Central?.Nombre ?? string.Empty,
        Nombre = c.Nombre,
        ValorApertura = c.ValorApertura,
        Disponible = c.Disponible,
        TotalUsado = c.TotalUsado,
        NombreDirector = c.Director?.Nombre ?? string.Empty,
        NombreAdministrador = string.Join(", ", c.Administradores.Select(a => a.Nombre)),
        Estado = c.Estado.ToString(),
        FechaApertura = c.FechaApertura
    };
}
