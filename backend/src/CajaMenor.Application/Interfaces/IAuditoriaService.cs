using CajaMenor.Application.Common;
using CajaMenor.Application.DTOs;

namespace CajaMenor.Application.Interfaces;

public interface IAuditoriaService
{
    /// <summary>
    /// Obtiene los registros de auditoría. El Maestro ve todos; un Director ve solo los de su caja.
    /// </summary>
    /// <param name="limite">Número máximo de registros a devolver.</param>
    /// <param name="esMaestro">Si es true, devuelve todos los registros sin filtrar por caja.</param>
    /// <param name="identityUserId">Id de Identity del solicitante (para resolver la caja del Director).</param>
    Task<Result<List<AuditoriaDto>>> ObtenerAsync(int limite = 200, bool esMaestro = true, string? identityUserId = null);
}
