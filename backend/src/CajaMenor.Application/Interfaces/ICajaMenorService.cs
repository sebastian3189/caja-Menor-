using CajaMenor.Application.Common;
using CajaMenor.Application.DTOs;

namespace CajaMenor.Application.Interfaces;

public interface ICajaMenorService
{
    Task<Result<CajaMenorDto>> ObtenerPorUsuarioAsync(string identityUserId);
    Task<Result<CajaMenorDto>> CrearAsync(CrearCajaMenorDto dto);
    Task<Result<DashboardDto>> ObtenerDashboardAsync(int cajaId);
}
