using CajaMenor.Application.Common;
using CajaMenor.Application.DTOs;
using CajaMenor.Application.Interfaces;
using CajaMenor.Domain.Entities;
using CajaMenor.Domain.Enums;
using CajaMenor.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using System.IO;

namespace CajaMenor.Infrastructure.Services;

public class LegalizacionService(AppDbContext db) : ILegalizacionService
{
    public async Task<Result<List<LegalizacionDto>>> ObtenerPorCajaAsync(int cajaId)
    {
        var legalizaciones = await db.Legalizaciones
            .Include(l => l.Caja)
            .Include(l => l.Avance)
            .Include(l => l.Recibos)
            .Where(l => l.CajaId == cajaId)
            .OrderByDescending(l => l.FechaCreacion)
            .ToListAsync();
        return Result<List<LegalizacionDto>>.Ok(legalizaciones.Select(MapToDto).ToList());
    }

    public async Task<Result<LegalizacionDto>> ObtenerPorIdAsync(int id)
    {
        var leg = await db.Legalizaciones
            .Include(l => l.Caja)
            .Include(l => l.Avance)
            .Include(l => l.Recibos)
            .FirstOrDefaultAsync(l => l.Id == id);
        if (leg is null) return Result<LegalizacionDto>.Fail("Legalización no encontrada");
        return Result<LegalizacionDto>.Ok(MapToDto(leg));
    }

    public async Task<Result<LegalizacionDto>> CrearAsync(CrearLegalizacionDto dto)
    {
        var existe = await db.Legalizaciones.AnyAsync(l => l.CodigoLegalizacion == dto.CodigoLegalizacion);
        if (existe) return Result<LegalizacionDto>.Fail($"Ya existe una legalización con código {dto.CodigoLegalizacion}");

        decimal valorAvance = 0;
        if (dto.AvanceId.HasValue)
        {
            var avance = await db.Avances.FindAsync(dto.AvanceId.Value);
            if (avance is null) return Result<LegalizacionDto>.Fail("Avance no encontrado");
            if (avance.Estado == EstadoAvance.Legalizado)
                return Result<LegalizacionDto>.Fail("El avance ya está legalizado");

            valorAvance = avance.ValorAvance;
            avance.Estado = EstadoAvance.Legalizado;
        }

        var legalizacion = new Legalizacion
        {
            CajaId = dto.CajaId,
            CodigoLegalizacion = dto.CodigoLegalizacion,
            Monto = dto.Monto,
            Descripcion = dto.Descripcion,
            TipoLegalizacion = dto.TipoLegalizacion,
            FechaLegalizacion = dto.FechaLegalizacion,
            AvanceId = dto.AvanceId,
            ValorAvance = valorAvance,
            EstadoReembolso = EstadoReembolso.SinReembolso
        };

        legalizacion.CalcularDiferencias();

        // Determinar tipo de avance si hay avance ligado
        if (dto.AvanceId.HasValue)
        {
            var avance = await db.Avances.FindAsync(dto.AvanceId.Value);
            if (avance is not null)
            {
                avance.TipoAvance = legalizacion.Diferencia == 0
                    ? TipoAvance.Total
                    : legalizacion.Diferencia > 0
                        ? TipoAvance.Sobrante  // Diferencia positiva: V.Avance > Monto → gastó menos
                        : TipoAvance.Faltante; // Diferencia negativa: V.Avance < Monto → gastó más
            }
        }

        var caja = await db.CajasMenores.FindAsync(dto.CajaId);
        if (caja is not null)
        {
            if (legalizacion.Diferencia > 0)
            {
                // Sobrante: empleado devuelve el exceso → disponible sube
                caja.Disponible += legalizacion.Diferencia;
                caja.TotalUsado -= legalizacion.Diferencia;
            }
            else if (legalizacion.DescuentoCaja > 0)
            {
                // Faltante: empleado gastó más → disponible baja por el exceso
                caja.Disponible -= legalizacion.DescuentoCaja;
                caja.TotalUsado += legalizacion.DescuentoCaja;
            }
        }

        db.Legalizaciones.Add(legalizacion);
        await db.SaveChangesAsync();
        await db.Entry(legalizacion).Reference(l => l.Caja).LoadAsync();

        return Result<LegalizacionDto>.Ok(MapToDto(legalizacion));
    }

    public async Task<Result<LegalizacionDto>> IniciarReembolsoAsync(int legalizacionId)
    {
        var leg = await db.Legalizaciones.Include(l => l.Caja).Include(l => l.Avance).FirstOrDefaultAsync(l => l.Id == legalizacionId);
        if (leg is null) return Result<LegalizacionDto>.Fail("Legalización no encontrada");

        if (leg.EstadoReembolso == EstadoReembolso.Reembolsado)
            return Result<LegalizacionDto>.Fail("Esta legalización ya fue reembolsada");

        // Si ya existe un reembolso, sincronizar estado y devolver éxito (idempotente)
        if (await db.Reembolsos.AnyAsync(r => r.LegalizacionId == legalizacionId))
        {
            if (leg.EstadoReembolso == EstadoReembolso.SinReembolso)
            {
                leg.EstadoReembolso = EstadoReembolso.EnProceso;
                await db.SaveChangesAsync();
            }
            return Result<LegalizacionDto>.Ok(MapToDto(leg));
        }

        var reembolso = new Reembolso
        {
            LegalizacionId = legalizacionId,
            AvanceId = leg.AvanceId,
            CodigoCentral = leg.Caja.Nombre,
            ValorAvance = leg.ValorAvance,
            ValorLegalizado = leg.Monto,
            Debe = leg.DescuentoCaja,
            Debemos = leg.ValorReembolsar,
            Monto = leg.ValorReembolsar > 0 ? leg.ValorReembolsar : leg.DescuentoCaja,
            Estado = EstadoReembolso.SinReembolso,
            FechaReembolso = DateTime.UtcNow
        };

        leg.EstadoReembolso = EstadoReembolso.EnProceso;

        db.Reembolsos.Add(reembolso);
        await db.SaveChangesAsync();

        return Result<LegalizacionDto>.Ok(MapToDto(leg));
    }

    public async Task<Result<ResumenLegalizacionesDto>> ObtenerResumenAsync(int cajaId)
    {
        var legs = await db.Legalizaciones.Where(l => l.CajaId == cajaId).ToListAsync();
        return Result<ResumenLegalizacionesDto>.Ok(new ResumenLegalizacionesDto
        {
            Total = legs.Count,
            SinAvance = legs.Count(l => l.AvanceId == null),
            ConAvance = legs.Count(l => l.AvanceId != null)
        });
    }

    public async Task<Result<ReciboDto>> SubirReciboAsync(int legalizacionId, string nombreOriginal, string rutaArchivo)
    {
        var leg = await db.Legalizaciones.FindAsync(legalizacionId);
        if (leg is null) return Result<ReciboDto>.Fail("Legalización no encontrada");
        if (leg.EstadoReembolso != EstadoReembolso.SinReembolso)
            return Result<ReciboDto>.Fail("Solo se pueden subir recibos antes de iniciar el proceso de reembolso");

        var recibo = new LegalizacionRecibo
        {
            LegalizacionId = legalizacionId,
            NombreOriginal = nombreOriginal,
            RutaArchivo = rutaArchivo
        };
        db.LegalizacionRecibos.Add(recibo);
        await db.SaveChangesAsync();

        return Result<ReciboDto>.Ok(new ReciboDto
        {
            Id = recibo.Id,
            NombreOriginal = recibo.NombreOriginal,
            Url = $"/uploads/recibos/{Path.GetFileName(rutaArchivo)}",
            FechaSubida = recibo.FechaSubida
        });
    }

    public async Task<Result> EliminarReciboAsync(int reciboId)
    {
        var recibo = await db.LegalizacionRecibos.FindAsync(reciboId);
        if (recibo is null) return Result.Fail("Recibo no encontrado");
        if (System.IO.File.Exists(recibo.RutaArchivo))
            System.IO.File.Delete(recibo.RutaArchivo);
        db.LegalizacionRecibos.Remove(recibo);
        await db.SaveChangesAsync();
        return Result.Ok();
    }

    public async Task<Result<LegalizacionDto>> EditarAsync(int id, EditarLegalizacionDto dto)
    {
        var leg = await db.Legalizaciones
            .Include(l => l.Caja)
            .Include(l => l.Avance)
            .Include(l => l.Recibos)
            .FirstOrDefaultAsync(l => l.Id == id);

        if (leg is null) return Result<LegalizacionDto>.Fail("Legalización no encontrada");
        if (leg.EstadoReembolso != EstadoReembolso.SinReembolso)
            return Result<LegalizacionDto>.Fail("Solo se pueden editar legalizaciones con estado 'Sin Reembolso'");

        // Verificar código duplicado (si cambió)
        if (leg.CodigoLegalizacion != dto.CodigoLegalizacion)
        {
            var existe = await db.Legalizaciones.AnyAsync(l => l.CodigoLegalizacion == dto.CodigoLegalizacion && l.Id != id);
            if (existe) return Result<LegalizacionDto>.Fail($"Ya existe una legalización con código {dto.CodigoLegalizacion}");
        }

        // Revertir efecto anterior sobre la caja antes de recalcular
        var caja = leg.Caja;
        if (leg.Diferencia > 0)
        {
            caja.Disponible -= leg.Diferencia;
            caja.TotalUsado += leg.Diferencia;
        }
        else if (leg.DescuentoCaja > 0)
        {
            caja.Disponible += leg.DescuentoCaja;
            caja.TotalUsado -= leg.DescuentoCaja;
        }

        // Aplicar nuevos valores y recalcular
        leg.CodigoLegalizacion = dto.CodigoLegalizacion;
        leg.FechaLegalizacion = dto.FechaLegalizacion;
        leg.Monto = dto.Monto;
        leg.Descripcion = dto.Descripcion;
        leg.TipoLegalizacion = dto.TipoLegalizacion;

        leg.CalcularDiferencias();

        // Recalcular TipoAvance si tiene avance ligado
        if (leg.Avance is not null)
        {
            leg.Avance.TipoAvance = leg.Diferencia == 0
                ? TipoAvance.Total
                : leg.Diferencia > 0 ? TipoAvance.Sobrante : TipoAvance.Faltante;
        }

        // Aplicar nuevo efecto sobre la caja
        if (leg.Diferencia > 0)
        {
            caja.Disponible += leg.Diferencia;
            caja.TotalUsado -= leg.Diferencia;
        }
        else if (leg.DescuentoCaja > 0)
        {
            caja.Disponible -= leg.DescuentoCaja;
            caja.TotalUsado += leg.DescuentoCaja;
        }

        await db.SaveChangesAsync();
        return Result<LegalizacionDto>.Ok(MapToDto(leg));
    }

    private static LegalizacionDto MapToDto(Legalizacion l) => new()
    {
        Id = l.Id,
        CajaId = l.CajaId,
        CodigoLegalizacion = l.CodigoLegalizacion,
        Monto = l.Monto,
        Descripcion = l.Descripcion,
        TipoLegalizacion = l.TipoLegalizacion,
        FechaLegalizacion = l.FechaLegalizacion,
        AvanceId = l.AvanceId,
        CodigoAvance = l.Avance?.CodigoAvance,
        ValorAvance = l.ValorAvance,
        Diferencia = l.Diferencia,
        DescuentoCaja = l.DescuentoCaja,
        ValorReembolsar = l.ValorReembolsar,
        EstadoReembolso = l.EstadoReembolso.ToString(),
        NombreCaja = l.Caja?.Nombre ?? string.Empty,
        ReembolsoFinalizado = l.EstadoReembolso == EstadoReembolso.Reembolsado,
        Recibos = l.Recibos.Select(r => new ReciboDto
        {
            Id = r.Id,
            NombreOriginal = r.NombreOriginal,
            Url = $"/uploads/recibos/{Path.GetFileName(r.RutaArchivo)}",
            FechaSubida = r.FechaSubida
        }).ToList()
    };
}
