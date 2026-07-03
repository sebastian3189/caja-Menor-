using CajaMenor.Application.Common;
using CajaMenor.Application.DTOs;

namespace CajaMenor.Application.Interfaces;

public interface IAuthService
{
    Task<Result<LoginResponseDto>> LoginAsync(LoginDto dto);
    Task<Result> RegistrarUsuarioAsync(RegistrarUsuarioDto dto);
    Task<Result<List<UsuarioListDto>>> ListarUsuariosAsync();
    Task<Result> EditarUsuarioAsync(string userId, EditarUsuarioDto dto);
    Task<Result> EliminarUsuarioAsync(string userId);
    Task<Result> AsignarCajaAsync(string userId, int cajaId);

    /// <summary>Genera un token de recuperación y envía el correo con el enlace. Siempre devuelve Ok (no revela si el correo existe).</summary>
    Task<Result> SolicitarRecuperacionAsync(ForgotPasswordDto dto);
    /// <summary>Restablece la contraseña usando el token enviado por correo.</summary>
    Task<Result> RestablecerPasswordAsync(ResetPasswordDto dto);
    /// <summary>Cambia la contraseña del usuario autenticado (usado en el primer ingreso obligatorio y en cambios voluntarios).</summary>
    Task<Result> CambiarPasswordAsync(string identityUserId, CambiarPasswordDto dto);
}
