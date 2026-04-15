using System.Text;
using CajaMenor.Application.DTOs;
using CajaMenor.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CajaMenor.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController(IAuthService authService, IConfiguration configuration) : ControllerBase
{
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginDto dto)
    {
        var result = await authService.LoginAsync(dto);
        if (!result.Success) return Unauthorized(new { message = result.Error });
        return Ok(result.Data);
    }

    [HttpPost("registrar")]
    public async Task<IActionResult> Registrar([FromBody] RegistrarUsuarioDto dto)
    {
        var result = await authService.RegistrarUsuarioAsync(dto);
        if (!result.Success) return BadRequest(new { errors = result.Errors });
        return Ok(new { message = "Usuario registrado exitosamente" });
    }

    /// <summary>Lista todos los usuarios. Requiere credenciales de usuario maestro en cabecera Authorization (Basic).</summary>
    [HttpGet("usuarios")]
    public async Task<IActionResult> ListarUsuarios()
    {
        if (!ValidarMaestro()) return Unauthorized(new { message = "Credenciales maestro inválidas" });
        var result = await authService.ListarUsuariosAsync();
        return Ok(result.Data);
    }

    /// <summary>Elimina un usuario por su Id. Requiere credenciales de usuario maestro en cabecera Authorization (Basic).</summary>
    [HttpDelete("usuarios/{userId}")]
    public async Task<IActionResult> EliminarUsuario(string userId)
    {
        if (!ValidarMaestro()) return Unauthorized(new { message = "Credenciales maestro inválidas" });
        var result = await authService.EliminarUsuarioAsync(userId);
        if (!result.Success) return BadRequest(new { errors = result.Errors });
        return Ok(new { message = "Usuario eliminado exitosamente" });
    }

    /// <summary>
    /// Asigna o cambia la caja de un usuario (Director o Administrador).
    /// Un Director reemplaza al director actual de la caja.
    /// Un Administrador se agrega a la caja (puede haber varios).
    /// Requiere JWT de Director.
    /// </summary>
    [HttpPut("usuarios/{userId}/asignar-caja/{cajaId}")]
    [Authorize(Roles = "Director")]
    public async Task<IActionResult> AsignarCaja(string userId, int cajaId)
    {
        var result = await authService.AsignarCajaAsync(userId, cajaId);
        if (!result.Success) return BadRequest(new { errors = result.Errors });
        return Ok(new { message = "Caja asignada correctamente" });
    }

    private bool ValidarMaestro()
    {
        var authHeader = Request.Headers["Authorization"].ToString();
        if (!authHeader.StartsWith("Basic ")) return false;

        var credenciales = Encoding.UTF8.GetString(Convert.FromBase64String(authHeader["Basic ".Length..]));
        var partes = credenciales.Split(':', 2);
        if (partes.Length != 2) return false;

        var masterUser = configuration["MasterAdmin:User"];
        var masterPass = configuration["MasterAdmin:Password"];

        return partes[0] == masterUser && partes[1] == masterPass;
    }
}
