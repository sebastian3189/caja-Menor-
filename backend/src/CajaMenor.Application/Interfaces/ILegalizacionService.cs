using CajaMenor.Application.Common;
using CajaMenor.Application.DTOs;

namespace CajaMenor.Application.Interfaces;

public interface ILegalizacionService
{
    Task<Result<List<LegalizacionDto>>> ObtenerPorCajaAsync(int cajaId);
    Task<Result<LegalizacionDto>> ObtenerPorIdAsync(int id);
    Task<Result<LegalizacionDto>> CrearAsync(CrearLegalizacionDto dto);
    Task<Result<LegalizacionDto>> IniciarReembolsoAsync(int legalizacionId);
    Task<Result<ResumenLegalizacionesDto>> ObtenerResumenAsync(int cajaId);
    Task<Result<ReciboDto>> SubirReciboAsync(int legalizacionId, string nombreOriginal, string rutaArchivo, decimal? valorOcr, bool validadoOcr, string? notaOcr);
    Task<Result> EliminarReciboAsync(int reciboId);
    Task<Result<LegalizacionDto>> EditarAsync(int id, EditarLegalizacionDto dto);
    Task<Result<string>> ObtenerSiguienteCodigoAsync(int cajaId);
}
