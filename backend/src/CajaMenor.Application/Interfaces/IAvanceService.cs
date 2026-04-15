using CajaMenor.Application.Common;
using CajaMenor.Application.DTOs;

namespace CajaMenor.Application.Interfaces;

public interface IAvanceService
{
    Task<Result<List<AvanceDto>>> ObtenerPorCajaAsync(int cajaId);
    Task<Result<AvanceDto>> ObtenerPorIdAsync(int id);
    Task<Result<AvanceDto>> CrearAsync(CrearAvanceDto dto);
    Task<Result<ResumenAvancesDto>> ObtenerResumenAsync(int cajaId);
    Task<Result<List<AvanceDto>>> ObtenerPendientesAsync(int cajaId);
    Task<Result<AvanceDto>> EditarAsync(int id, EditarAvanceDto dto);
}
