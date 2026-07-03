using CajaMenor.Application.Common;
using CajaMenor.Application.DTOs;
using CajaMenor.Application.Interfaces;
using CajaMenor.Domain.Entities;
using CajaMenor.Domain.Enums;
using CajaMenor.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace CajaMenor.Infrastructure.Services;

public class SolicitudAvanceService(AppDbContext db, IAvanceService avanceService) : ISolicitudAvanceService
{
    public async Task<Result<SolicitudAvanceDto>> CrearAsync(string identityUserId, CrearSolicitudAvanceDto dto)
    {
        if (dto.ValorSolicitado <= 0)
            return Result<SolicitudAvanceDto>.Fail("El valor solicitado debe ser mayor a 0.");
        if (string.IsNullOrWhiteSpace(dto.Descripcion))
            return Result<SolicitudAvanceDto>.Fail("La descripción es requerida.");

        var solicitante = await db.UsuariosApp
            .Include(u => u.CajasMenoresComoSolicitante)
            .FirstOrDefaultAsync(u => u.IdentityUserId == identityUserId);
        if (solicitante is null) return Result<SolicitudAvanceDto>.Fail("Perfil de solicitante no encontrado.");

        var caja = solicitante.CajasMenoresComoSolicitante.FirstOrDefault();
        if (caja is null) return Result<SolicitudAvanceDto>.Fail("No tiene una caja asignada. Contacte al usuario Maestro.");
        if (caja.Estado == EstadoCaja.Cerrada) return Result<SolicitudAvanceDto>.Fail("La caja está cerrada; no admite solicitudes.");

        var solicitud = new SolicitudAvance
        {
            CajaId = caja.Id,
            SolicitanteId = solicitante.Id,
            ValorSolicitado = dto.ValorSolicitado,
            Descripcion = dto.Descripcion.Trim(),
            Estado = EstadoSolicitud.Pendiente,
            FechaSolicitud = DateTime.UtcNow
        };
        db.SolicitudesAvance.Add(solicitud);
        await db.SaveChangesAsync();

        return Result<SolicitudAvanceDto>.Ok(await MapAsync(solicitud.Id));
    }

    public async Task<Result<List<SolicitudAvanceDto>>> ObtenerMiasAsync(string identityUserId)
    {
        var solicitante = await db.UsuariosApp.FirstOrDefaultAsync(u => u.IdentityUserId == identityUserId);
        if (solicitante is null) return Result<List<SolicitudAvanceDto>>.Fail("Perfil de solicitante no encontrado.");

        var lista = await db.SolicitudesAvance
            .Include(s => s.Caja).Include(s => s.Solicitante).Include(s => s.Avance)
            .Where(s => s.SolicitanteId == solicitante.Id)
            .OrderByDescending(s => s.FechaSolicitud)
            .Select(s => Map(s))
            .ToListAsync();
        return Result<List<SolicitudAvanceDto>>.Ok(lista);
    }

    public async Task<Result<List<SolicitudAvanceDto>>> ObtenerPorCajaAsync(int cajaId)
    {
        var lista = await db.SolicitudesAvance
            .Include(s => s.Caja).Include(s => s.Solicitante).Include(s => s.Avance)
            .Where(s => s.CajaId == cajaId)
            .OrderByDescending(s => s.FechaSolicitud)
            .Select(s => Map(s))
            .ToListAsync();
        return Result<List<SolicitudAvanceDto>>.Ok(lista);
    }

    public async Task<Result<List<SolicitudAvanceDto>>> ObtenerPendientesPorCajaAsync(int cajaId)
    {
        var lista = await db.SolicitudesAvance
            .Include(s => s.Caja).Include(s => s.Solicitante).Include(s => s.Avance)
            .Where(s => s.CajaId == cajaId && s.Estado == EstadoSolicitud.Pendiente)
            .OrderByDescending(s => s.FechaSolicitud)
            .Select(s => Map(s))
            .ToListAsync();
        return Result<List<SolicitudAvanceDto>>.Ok(lista);
    }

    public async Task<Result<SolicitudAvanceDto>> AceptarAsync(int solicitudId)
    {
        var solicitud = await db.SolicitudesAvance
            .Include(s => s.Solicitante)
            .FirstOrDefaultAsync(s => s.Id == solicitudId);
        if (solicitud is null) return Result<SolicitudAvanceDto>.Fail("Solicitud no encontrada.");
        if (solicitud.Estado != EstadoSolicitud.Pendiente)
            return Result<SolicitudAvanceDto>.Fail("La solicitud ya fue respondida.");

        // Generar el avance reutilizando la lógica de negocio (tope de caja, disponible, etc.)
        var codigo = (await avanceService.ObtenerSiguienteCodigoAsync(solicitud.CajaId)).Data ?? "REQ-0001";
        var avanceResult = await avanceService.CrearAsync(new CrearAvanceDto
        {
            CajaId = solicitud.CajaId,
            CodigoAvance = codigo,
            FechaEnvio = DateTime.UtcNow,
            ValorAvance = solicitud.ValorSolicitado,
            Descripcion = solicitud.Descripcion,
            Solicitante = solicitud.Solicitante.Nombre
        });
        if (!avanceResult.Success)
            return Result<SolicitudAvanceDto>.Fail(avanceResult.Error ?? "No se pudo crear el avance.");

        solicitud.Estado = EstadoSolicitud.Aceptada;
        solicitud.FechaRespuesta = DateTime.UtcNow;
        solicitud.AvanceId = avanceResult.Data!.Id;
        await db.SaveChangesAsync();

        return Result<SolicitudAvanceDto>.Ok(await MapAsync(solicitud.Id));
    }

    public async Task<Result<SolicitudAvanceDto>> RechazarAsync(int solicitudId, string? motivo)
    {
        var solicitud = await db.SolicitudesAvance.FirstOrDefaultAsync(s => s.Id == solicitudId);
        if (solicitud is null) return Result<SolicitudAvanceDto>.Fail("Solicitud no encontrada.");
        if (solicitud.Estado != EstadoSolicitud.Pendiente)
            return Result<SolicitudAvanceDto>.Fail("La solicitud ya fue respondida.");

        solicitud.Estado = EstadoSolicitud.Rechazada;
        solicitud.FechaRespuesta = DateTime.UtcNow;
        solicitud.MotivoRechazo = string.IsNullOrWhiteSpace(motivo) ? null : motivo.Trim();
        await db.SaveChangesAsync();

        return Result<SolicitudAvanceDto>.Ok(await MapAsync(solicitud.Id));
    }

    public async Task<Result<List<SolicitanteDto>>> ObtenerSolicitantesDeCajaAsync(int cajaId)
    {
        var caja = await db.CajasMenores
            .Include(c => c.Solicitantes)
            .FirstOrDefaultAsync(c => c.Id == cajaId);
        if (caja is null) return Result<List<SolicitanteDto>>.Fail("Caja no encontrada.");

        var lista = caja.Solicitantes
            .OrderBy(s => s.Nombre)
            .Select(s => new SolicitanteDto { Id = s.Id, NombreCompleto = s.Nombre, Email = s.Email })
            .ToList();
        return Result<List<SolicitanteDto>>.Ok(lista);
    }

    private async Task<SolicitudAvanceDto> MapAsync(int id)
    {
        var s = await db.SolicitudesAvance
            .Include(x => x.Caja).Include(x => x.Solicitante).Include(x => x.Avance)
            .FirstAsync(x => x.Id == id);
        return Map(s);
    }

    private static SolicitudAvanceDto Map(SolicitudAvance s) => new()
    {
        Id = s.Id,
        CajaId = s.CajaId,
        NombreCaja = s.Caja?.Nombre ?? string.Empty,
        SolicitanteId = s.SolicitanteId,
        NombreSolicitante = s.Solicitante?.Nombre ?? string.Empty,
        ValorSolicitado = s.ValorSolicitado,
        Descripcion = s.Descripcion,
        Estado = s.Estado.ToString(),
        FechaSolicitud = s.FechaSolicitud,
        FechaRespuesta = s.FechaRespuesta,
        AvanceId = s.AvanceId,
        CodigoAvance = s.Avance?.CodigoAvance,
        MotivoRechazo = s.MotivoRechazo
    };
}
