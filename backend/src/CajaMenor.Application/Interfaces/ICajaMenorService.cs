using CajaMenor.Application.Common;
using CajaMenor.Application.DTOs;

namespace CajaMenor.Application.Interfaces;

public interface ICajaMenorService
{
    Task<Result<CajaMenorDto>> ObtenerPorUsuarioAsync(string identityUserId);
    Task<Result<CajaMenorDto>> CrearAsync(CrearCajaMenorDto dto);
    Task<Result<DashboardDto>> ObtenerDashboardAsync(int cajaId);
    Task<Result<List<CajaMenorDto>>> ListarTodasAsync();
    Task<Result<CajaMenorDto>> EditarAsync(int id, EditarCajaMenorDto dto);
    Task<Result> EliminarAsync(int id);
    Task<Result<CajaMenorDto>> CerrarAsync(int id);
    Task<Result<CajaMenorDto>> ReabrirAsync(int id);
}
