using CajaMenor.Application.Common;
using CajaMenor.Application.DTOs;

namespace CajaMenor.Application.Interfaces;

public interface IAuthService
{
    Task<Result<LoginResponseDto>> LoginAsync(LoginDto dto);
    Task<Result> RegistrarUsuarioAsync(RegistrarUsuarioDto dto);
    Task<Result<List<UsuarioListDto>>> ListarUsuariosAsync();
    Task<Result> EliminarUsuarioAsync(string userId);
    Task<Result> AsignarCajaAsync(string userId, int cajaId);
}
