using System.Linq.Expressions;
using CajaMenor.Application.Common;
using CajaMenor.Application.DTOs;
using CajaMenor.Application.Interfaces;
using CajaMenor.Infrastructure.Identity;
using CajaMenor.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace CajaMenor.Infrastructure.Services;

public class AuditoriaService(AppDbContext db) : IAuditoriaService
{
    public async Task<Result<List<AuditoriaDto>>> ObtenerAsync(int limite = 200, bool esMaestro = true, string? identityUserId = null)
    {
        IQueryable<Domain.Entities.AuditLog> query = db.AuditLogs;

        // Un Director solo puede ver los movimientos de su propia caja.
        if (!esMaestro)
        {
            var filtro = await ConstruirFiltroDirectorAsync(identityUserId);
            if (filtro is null)
                return Result<List<AuditoriaDto>>.Ok(new List<AuditoriaDto>()); // sin caja asignada → nada que ver
            query = query.Where(filtro);
        }

        var logs = await query
            .OrderByDescending(l => l.Fecha)
            .Take(limite)
            .ToListAsync();

        // Resolver nombres de usuario en un solo lote
        var userIds = logs.Select(l => l.UsuarioId).Distinct().ToList();
        var usuarios = await db.Users
            .Where(u => userIds.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id, u => u.NombreCompleto);

        var dtos = logs.Select(l => new AuditoriaDto
        {
            Id = l.Id,
            Tabla = l.Tabla,
            RegistroId = l.RegistroId,
            Usuario = usuarios.TryGetValue(l.UsuarioId, out var nombre) && !string.IsNullOrWhiteSpace(nombre)
                ? nombre
                : (l.UsuarioId == "sistema" ? "Sistema" : l.UsuarioId),
            Accion = l.Accion,
            Fecha = l.Fecha,
            DatosAnteriores = l.DatosAnteriores,
            DatosNuevos = l.DatosNuevos,
        }).ToList();

        return Result<List<AuditoriaDto>>.Ok(dtos);
    }

    /// <summary>
    /// Construye un predicado que limita los AuditLog a los registros de la caja que dirige el usuario.
    /// Devuelve null si el usuario no existe o no tiene una caja asignada como Director.
    /// Los nombres de tabla coinciden con <c>entity.GetType().Name</c> usado por el interceptor de auditoría.
    /// </summary>
    private async Task<Expression<Func<Domain.Entities.AuditLog, bool>>?> ConstruirFiltroDirectorAsync(string? identityUserId)
    {
        if (string.IsNullOrWhiteSpace(identityUserId)) return null;

        var usuarioApp = await db.UsuariosApp.FirstOrDefaultAsync(u => u.IdentityUserId == identityUserId);
        if (usuarioApp is null) return null;

        var caja = await db.CajasMenores.FirstOrDefaultAsync(c => c.DirectorId == usuarioApp.Id);
        if (caja is null) return null;
        var cajaId = caja.Id;

        var avanceIds = await db.Avances.Where(a => a.CajaId == cajaId).Select(a => a.Id).ToListAsync();
        var legIds = await db.Legalizaciones.Where(l => l.CajaId == cajaId).Select(l => l.Id).ToListAsync();
        var arqueoIds = await db.Arqueos.Where(a => a.CajaId == cajaId).Select(a => a.Id).ToListAsync();
        var solicitudIds = await db.SolicitudesAvance.Where(s => s.CajaId == cajaId).Select(s => s.Id).ToListAsync();
        var reembolsoIds = await db.Reembolsos.Where(r => legIds.Contains(r.LegalizacionId)).Select(r => r.Id).ToListAsync();
        var reciboIds = await db.LegalizacionRecibos.Where(r => legIds.Contains(r.LegalizacionId)).Select(r => r.Id).ToListAsync();

        return l =>
            (l.Tabla == "CajaMenorEntity" && l.RegistroId == cajaId)
            || (l.Tabla == "Avance" && avanceIds.Contains(l.RegistroId))
            || (l.Tabla == "Legalizacion" && legIds.Contains(l.RegistroId))
            || (l.Tabla == "Arqueo" && arqueoIds.Contains(l.RegistroId))
            || (l.Tabla == "SolicitudAvance" && solicitudIds.Contains(l.RegistroId))
            || (l.Tabla == "Reembolso" && reembolsoIds.Contains(l.RegistroId))
            || (l.Tabla == "LegalizacionRecibo" && reciboIds.Contains(l.RegistroId));
    }
}
