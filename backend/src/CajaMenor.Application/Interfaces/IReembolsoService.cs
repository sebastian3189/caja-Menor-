using CajaMenor.Application.Common;
using CajaMenor.Application.DTOs;

namespace CajaMenor.Application.Interfaces;

public interface IReembolsoService
{
    Task<Result<ResumenReembolsosDto>> ObtenerPorCajaAsync(int cajaId);
    Task<Result> ActivarReembolsosAsync(int cajaId);
    Task<Result> ConfirmarReembolsosAsync(int cajaId);
    Task<Result> CancelarAsync(int reembolsoId);
}
