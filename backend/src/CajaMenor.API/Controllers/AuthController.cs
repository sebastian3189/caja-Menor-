using System.IdentityModel.Tokens.Jwt;
using CajaMenor.Application.DTOs;
using CajaMenor.Application.Interfaces;
using CajaMenor.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace CajaMenor.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController(IAuthService authService, ITokenBlacklistService blacklist) : ControllerBase
{
    // S-06: máx. 5 intentos de login por minuto por IP (anti fuerza bruta)
    [HttpPost("login")]
    [EnableRateLimiting("login")]
    public async Task<IActionResult> Login([FromBody] LoginDto dto)
    {
        var result = await authService.LoginAsync(dto);
        if (!result.Success) return Unauthorized(new { message = result.Error });
        return Ok(result.Data);
    }

    /// <summary>Solicita el envío de un correo con el enlace para restablecer la contraseña.</summary>
    [HttpPost("forgot-password")]
    [AllowAnonymous]
    [EnableRateLimiting("login")]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordDto dto)
    {
        await authService.SolicitarRecuperacionAsync(dto);
        // Respuesta genérica: no revela si el correo existe
        return Ok(new { message = "Si el correo está registrado, enviaremos un enlace para restablecer la contraseña." });
    }

    /// <summary>Restablece la contraseña usando el token recibido por correo.</summary>
    [HttpPost("reset-password")]
    [AllowAnonymous]
    [EnableRateLimiting("login")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordDto dto)
    {
        var result = await authService.RestablecerPasswordAsync(dto);
        if (!result.Success) return BadRequest(new { errors = result.Errors });
        return Ok(new { message = "Contraseña actualizada correctamente. Ya puedes iniciar sesión." });
    }

    /// <summary>Cambia la contraseña del usuario autenticado (primer ingreso obligatorio o cambio voluntario).</summary>
    [HttpPost("cambiar-password")]
    [Authorize]
    public async Task<IActionResult> CambiarPassword([FromBody] CambiarPasswordDto dto)
    {
        var identityUserId = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value
            ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (identityUserId is null) return Unauthorized();

        var result = await authService.CambiarPasswordAsync(identityUserId, dto);
        if (!result.Success) return BadRequest(new { errors = result.Errors, message = result.Error });
        return Ok(new { message = "Contraseña actualizada correctamente." });
    }

    // S-02: invalida el token actual (logout real) agregando su jti a la lista negra
    [HttpPost("logout")]
    [Authorize]
    public IActionResult Logout()
    {
        var jti = User.FindFirst(JwtRegisteredClaimNames.Jti)?.Value;
        var expClaim = User.FindFirst(JwtRegisteredClaimNames.Exp)?.Value;

        if (jti is not null)
        {
            var expiracion = TimeSpan.FromHours(8);
            if (expClaim is not null && long.TryParse(expClaim, out var expUnix))
            {
                var restante = DateTimeOffset.FromUnixTimeSeconds(expUnix) - DateTimeOffset.UtcNow;
                if (restante > TimeSpan.Zero) expiracion = restante;
            }
            blacklist.Revocar(jti, expiracion);
        }
        return Ok(new { message = "Sesión cerrada correctamente" });
    }

    /// <summary>Crea un Director o Administrador. Solo el usuario Maestro puede dar de alta usuarios.</summary>
    [HttpPost("registrar")]
    [Authorize(Roles = RolUsuario.Maestro)]
    public async Task<IActionResult> Registrar([FromBody] RegistrarUsuarioDto dto)
    {
        var result = await authService.RegistrarUsuarioAsync(dto);
        if (!result.Success) return BadRequest(new { errors = result.Errors });
        return Ok(new { message = "Usuario registrado exitosamente" });
    }

    /// <summary>Lista todos los usuarios del sistema (todas las centrales/cajas). Solo Maestro.</summary>
    [HttpGet("usuarios")]
    [Authorize(Roles = RolUsuario.Maestro)]
    public async Task<IActionResult> ListarUsuarios()
    {
        var result = await authService.ListarUsuariosAsync();
        return Ok(result.Data);
    }

    /// <summary>Edita nombre, email, rol y opcionalmente la contraseña de un usuario. Solo Maestro.</summary>
    [HttpPut("usuarios/{userId}")]
    [Authorize(Roles = RolUsuario.Maestro)]
    public async Task<IActionResult> EditarUsuario(string userId, [FromBody] EditarUsuarioDto dto)
    {
        var result = await authService.EditarUsuarioAsync(userId, dto);
        if (!result.Success) return BadRequest(new { errors = result.Errors });
        return Ok(new { message = "Usuario actualizado correctamente" });
    }

    /// <summary>Elimina un usuario por su Id. Solo Maestro.</summary>
    [HttpDelete("usuarios/{userId}")]
    [Authorize(Roles = RolUsuario.Maestro)]
    public async Task<IActionResult> EliminarUsuario(string userId)
    {
        var result = await authService.EliminarUsuarioAsync(userId);
        if (!result.Success) return BadRequest(new { errors = result.Errors });
        return Ok(new { message = "Usuario eliminado exitosamente" });
    }

    /// <summary>
    /// Asigna o cambia la caja de un usuario (Director o Administrador).
    /// Un Director reemplaza al director actual de la caja.
    /// Un Administrador se agrega a la caja (puede haber varios).
    /// </summary>
    [HttpPut("usuarios/{userId}/asignar-caja/{cajaId}")]
    [Authorize(Roles = $"{RolUsuario.Director},{RolUsuario.Maestro}")]
    public async Task<IActionResult> AsignarCaja(string userId, int cajaId)
    {
        var result = await authService.AsignarCajaAsync(userId, cajaId);
        if (!result.Success) return BadRequest(new { errors = result.Errors });
        return Ok(new { message = "Caja asignada correctamente" });
    }
}
