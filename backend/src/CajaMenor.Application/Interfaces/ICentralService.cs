using CajaMenor.Application.DTOs;
using CajaMenor.Application.Common;

namespace CajaMenor.Application.Interfaces;

public interface ICentralService
{
    Task<Result<List<CentralDto>>> ListarAsync();
    Task<Result<CentralDto>> CrearAsync(CrearCentralDto dto);
    Task<Result> EliminarAsync(int id);
}
