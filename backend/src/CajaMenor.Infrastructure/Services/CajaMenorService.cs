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
        if (string.IsNullOrWhiteSpace(dto.Nombre))
            return Result<CajaMenorDto>.Fail("El nombre es requerido.");

        var central = await db.Centrales.FindAsync(dto.CentralId);
        if (central is null) return Result<CajaMenorDto>.Fail("Central no encontrada.");

        var director = await db.UsuariosApp.FindAsync(dto.DirectorId);
        if (director is null) return Result<CajaMenorDto>.Fail("Director no encontrado.");
        if (director.Rol != RolUsuario.Director) return Result<CajaMenorDto>.Fail("El usuario seleccionado no tiene rol Director.");

        // Un Director solo puede liderar una caja: si ya dirigía otra, queda sin ella
        await DesvincularCajaAnteriorDelDirectorAsync(dto.DirectorId, cajaIdActual: 0);
        director.CentralId = dto.CentralId;

        var caja = new CajaMenorEntity
        {
            CentralId = dto.CentralId,
            Nombre = dto.Nombre.Trim(),
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
            if (admin is not null)
            {
                // Un Administrador solo administra una caja a la vez: si ya administraba otra, se le quita
                await DesvincularCajaAnteriorDelAdministradorAsync(dto.AdministradorId, cajaIdActual: 0);
                admin.CentralId = dto.CentralId;
                caja.Administradores.Add(admin);
            }
        }

        db.CajasMenores.Add(caja);
        await db.SaveChangesAsync();
        await db.Entry(caja).Reference(c => c.Central).LoadAsync();
        await db.Entry(caja).Reference(c => c.Director).LoadAsync();
        await db.Entry(caja).Collection(c => c.Administradores).LoadAsync();
        return Result<CajaMenorDto>.Ok(MapToDto(caja));
    }

    public async Task<Result<List<CajaMenorDto>>> ListarTodasAsync()
    {
        var cajas = await db.CajasMenores
            .Include(c => c.Central)
            .Include(c => c.Director)
            .Include(c => c.Administradores)
            .OrderBy(c => c.Nombre)
            .ToListAsync();

        var lista = new List<CajaMenorDto>();
        foreach (var caja in cajas)
            lista.Add(MapToDto(caja));

        return Result<List<CajaMenorDto>>.Ok(lista);
    }

    public async Task<Result<CajaMenorDto>> EditarAsync(int id, EditarCajaMenorDto dto)
    {
        var caja = await db.CajasMenores
            .Include(c => c.Central)
            .Include(c => c.Director)
            .Include(c => c.Administradores)
            .FirstOrDefaultAsync(c => c.Id == id);

        if (caja is null) return Result<CajaMenorDto>.Fail("Caja no encontrada.");

        if (string.IsNullOrWhiteSpace(dto.Nombre))
            return Result<CajaMenorDto>.Fail("El nombre es requerido.");

        var central = await db.Centrales.FindAsync(dto.CentralId);
        if (central is null) return Result<CajaMenorDto>.Fail("Central no encontrada.");

        // El Director es opcional (0 = sin director asignado, disponible para asignar luego)
        if (dto.DirectorId != 0)
        {
            var director = await db.UsuariosApp.FindAsync(dto.DirectorId);
            if (director is null) return Result<CajaMenorDto>.Fail("Director no encontrado.");
            if (director.Rol != RolUsuario.Director) return Result<CajaMenorDto>.Fail("El usuario seleccionado no tiene rol Director.");

            // Un Director solo puede liderar una caja: si ya dirigía otra (distinta de esta), queda sin ella
            await DesvincularCajaAnteriorDelDirectorAsync(dto.DirectorId, cajaIdActual: id);
            director.CentralId = dto.CentralId;
        }

        // El Administrador es opcional (0 = sin administrador asignado)
        if (dto.AdministradorId != 0)
        {
            var admin = await db.UsuariosApp.FindAsync(dto.AdministradorId);
            if (admin is null) return Result<CajaMenorDto>.Fail("Administrador no encontrado.");
            if (admin.Rol != RolUsuario.Administrador) return Result<CajaMenorDto>.Fail("El usuario seleccionado no tiene rol Administrador.");

            // Un Administrador solo administra una caja a la vez: si ya administraba otra (distinta de esta), se le quita
            await DesvincularCajaAnteriorDelAdministradorAsync(dto.AdministradorId, cajaIdActual: id);
            admin.CentralId = dto.CentralId;

            caja.Administradores.Clear();
            caja.Administradores.Add(admin);
        }
        else
        {
            caja.Administradores.Clear();
        }

        // El valor de apertura solo se puede tocar mientras la caja no tenga movimientos
        if (dto.ValorApertura != caja.ValorApertura)
        {
            if (caja.TotalUsado != 0)
                return Result<CajaMenorDto>.Fail("No se puede editar el valor de apertura: la caja ya tiene movimientos registrados.");

            caja.ValorApertura = dto.ValorApertura;
            caja.Disponible = dto.ValorApertura;
        }

        caja.Nombre = dto.Nombre.Trim();
        caja.CentralId = dto.CentralId;
        caja.DirectorId = dto.DirectorId == 0 ? null : dto.DirectorId;

        await db.SaveChangesAsync();
        await db.Entry(caja).Reference(c => c.Central).LoadAsync();
        await db.Entry(caja).Reference(c => c.Director).LoadAsync();

        return Result<CajaMenorDto>.Ok(MapToDto(caja));
    }

    /// <summary>
    /// Un Director solo puede liderar una caja a la vez. Si ya dirigía otra caja distinta de
    /// <paramref name="cajaIdActual"/>, esa caja queda sin director (disponible para asignar uno nuevo).
    /// </summary>
    private async Task DesvincularCajaAnteriorDelDirectorAsync(int directorUsuarioAppId, int cajaIdActual)
    {
        var cajaAnterior = await db.CajasMenores
            .FirstOrDefaultAsync(c => c.DirectorId == directorUsuarioAppId && c.Id != cajaIdActual);
        if (cajaAnterior is not null)
            cajaAnterior.DirectorId = null;
    }

    /// <summary>
    /// Un Administrador solo administra una caja a la vez. Si ya administraba otra caja distinta de
    /// <paramref name="cajaIdActual"/>, se le quita de esa caja (disponible para asignar uno nuevo).
    /// </summary>
    private async Task DesvincularCajaAnteriorDelAdministradorAsync(int administradorUsuarioAppId, int cajaIdActual)
    {
        var cajasAnteriores = await db.CajasMenores
            .Include(c => c.Administradores)
            .Where(c => c.Id != cajaIdActual && c.Administradores.Any(a => a.Id == administradorUsuarioAppId))
            .ToListAsync();

        foreach (var c in cajasAnteriores)
        {
            var aRemover = c.Administradores.FirstOrDefault(a => a.Id == administradorUsuarioAppId);
            if (aRemover is not null) c.Administradores.Remove(aRemover);
        }
    }

    /// <summary>
    /// Elimina una caja. Solo se permite si está Cerrada: cerrar exige que no haya avances pendientes
    /// ni legalizaciones sin reembolso confirmado, por lo que una caja cerrada ya está "saldada".
    /// Si tiene historial, se borra en cascada (avances, legalizaciones, recibos, reembolsos, arqueos y sus archivos).
    /// </summary>
    public async Task<Result> EliminarAsync(int id)
    {
        var caja = await db.CajasMenores.Include(c => c.Administradores).FirstOrDefaultAsync(c => c.Id == id);
        if (caja is null) return Result.Fail("Caja no encontrada.");

        if (caja.Estado != EstadoCaja.Cerrada)
            return Result.Fail("Solo se pueden eliminar cajas cerradas y saldadas. Cierre la caja primero.");

        // Solicitudes de avance primero (FK NoAction hacia caja y avance)
        db.SolicitudesAvance.RemoveRange(await db.SolicitudesAvance.Where(s => s.CajaId == id).ToListAsync());

        var legIds = await db.Legalizaciones.Where(l => l.CajaId == id).Select(l => l.Id).ToListAsync();

        var recibos = await db.LegalizacionRecibos.Where(r => legIds.Contains(r.LegalizacionId)).ToListAsync();
        foreach (var r in recibos)
            if (System.IO.File.Exists(r.RutaArchivo)) System.IO.File.Delete(r.RutaArchivo);
        db.LegalizacionRecibos.RemoveRange(recibos);

        var reembolsos = await db.Reembolsos.Where(r => legIds.Contains(r.LegalizacionId)).ToListAsync();
        db.Reembolsos.RemoveRange(reembolsos);

        db.Legalizaciones.RemoveRange(await db.Legalizaciones.Where(l => l.CajaId == id).ToListAsync());
        db.Avances.RemoveRange(await db.Avances.Where(a => a.CajaId == id).ToListAsync());

        var arqueos = await db.Arqueos.Where(a => a.CajaId == id).ToListAsync();
        foreach (var a in arqueos)
        {
            if (!string.IsNullOrEmpty(a.RutaFirmaDirectivo) && System.IO.File.Exists(a.RutaFirmaDirectivo)) System.IO.File.Delete(a.RutaFirmaDirectivo);
            if (!string.IsNullOrEmpty(a.RutaFirmaAdministrador) && System.IO.File.Exists(a.RutaFirmaAdministrador)) System.IO.File.Delete(a.RutaFirmaAdministrador);
        }
        db.Arqueos.RemoveRange(arqueos);

        caja.Administradores.Clear();
        db.CajasMenores.Remove(caja);
        await db.SaveChangesAsync();
        return Result.Ok();
    }

    public async Task<Result<CajaMenorDto>> CerrarAsync(int id)
    {
        var caja = await db.CajasMenores
            .Include(c => c.Central).Include(c => c.Director).Include(c => c.Administradores)
            .FirstOrDefaultAsync(c => c.Id == id);
        if (caja is null) return Result<CajaMenorDto>.Fail("Caja no encontrada.");
        if (caja.Estado == EstadoCaja.Cerrada) return Result<CajaMenorDto>.Fail("La caja ya está cerrada.");

        var avancesPendientes = await db.Avances.CountAsync(a => a.CajaId == id && a.Estado == EstadoAvance.Pendiente);
        if (avancesPendientes > 0)
            return Result<CajaMenorDto>.Fail($"No se puede cerrar: hay {avancesPendientes} avance(s) pendiente(s) de legalizar.");

        var legalizacionesSinResolver = await db.Legalizaciones.CountAsync(l => l.CajaId == id && l.EstadoReembolso != EstadoReembolso.Reembolsado);
        if (legalizacionesSinResolver > 0)
            return Result<CajaMenorDto>.Fail($"No se puede cerrar: hay {legalizacionesSinResolver} legalización(es) sin reembolso confirmado.");

        caja.Estado = EstadoCaja.Cerrada;
        await db.SaveChangesAsync();
        return Result<CajaMenorDto>.Ok(MapToDto(caja));
    }

    public async Task<Result<CajaMenorDto>> ReabrirAsync(int id)
    {
        var caja = await db.CajasMenores
            .Include(c => c.Central).Include(c => c.Director).Include(c => c.Administradores)
            .FirstOrDefaultAsync(c => c.Id == id);
        if (caja is null) return Result<CajaMenorDto>.Fail("Caja no encontrada.");
        if (caja.Estado == EstadoCaja.Abierta) return Result<CajaMenorDto>.Fail("La caja ya está abierta.");

        caja.Estado = EstadoCaja.Abierta;
        await db.SaveChangesAsync();
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

        // El dashboard muestra lo que sigue PENDIENTE. Lo ya reembolsado va aparte (histórico).
        var pendientes = avances.Count(a => a.Estado == EstadoAvance.Pendiente);
        var legalizadosActivos = avances.Count(a => a.Estado == EstadoAvance.Legalizado && a.EstadoReembolso != EstadoReembolso.Reembolsado);
        var totalActivoAv = pendientes + legalizadosActivos;
        var reembolsadosAv = avances.Where(a => a.EstadoReembolso == EstadoReembolso.Reembolsado).ToList();

        var sinAvanceActivo = legs.Count(l => l.AvanceId == null && l.EstadoReembolso != EstadoReembolso.Reembolsado);
        var conAvanceActivo = legs.Count(l => l.AvanceId != null && l.EstadoReembolso != EstadoReembolso.Reembolsado);
        var legReembolsadas = legs.Where(l => l.EstadoReembolso == EstadoReembolso.Reembolsado).ToList();

        return Result<DashboardDto>.Ok(new DashboardDto
        {
            Caja = MapToDto(caja),
            Avances = new ResumenAvancesDto
            {
                Total = totalActivoAv,
                Pendientes = pendientes,
                Legalizados = legalizadosActivos,
                PorcentajePendientes = totalActivoAv > 0 ? Math.Round((decimal)pendientes / totalActivoAv * 100, 1) : 0,
                PorcentajeLegalizados = totalActivoAv > 0 ? Math.Round((decimal)legalizadosActivos / totalActivoAv * 100, 1) : 0,
                Reembolsados = reembolsadosAv.Count,
                ValorReembolsados = reembolsadosAv.Sum(a => a.ValorAvance)
            },
            Legalizaciones = new ResumenLegalizacionesDto
            {
                Total = sinAvanceActivo + conAvanceActivo,
                SinAvance = sinAvanceActivo,
                ConAvance = conAvanceActivo,
                Reembolsadas = legReembolsadas.Count,
                ValorReembolsadas = legReembolsadas.Sum(l => l.Monto)
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
        DirectorId = c.DirectorId ?? 0,
        NombreDirector = c.Director?.Nombre ?? string.Empty,
        AdministradorIds = c.Administradores.Select(a => a.Id).ToList(),
        NombreAdministrador = string.Join(", ", c.Administradores.Select(a => a.Nombre)),
        Estado = c.Estado.ToString(),
        FechaApertura = c.FechaApertura,
        PuedeEditarApertura = c.TotalUsado == 0,
        // Cerrar exige 0 avances pendientes y 0 legalizaciones sin reembolso confirmado: la caja cerrada ya está saldada.
        PuedeEliminar = c.Estado == EstadoCaja.Cerrada
    };
}
