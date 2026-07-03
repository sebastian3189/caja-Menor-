using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using CajaMenor.Application.Interfaces;
using CajaMenor.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CajaMenor.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = $"{RolUsuario.Maestro},{RolUsuario.Director}")]
public class AuditoriaController(IAuditoriaService service) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Obtener([FromQuery] int limite = 200)
    {
        var esMaestro = User.IsInRole(RolUsuario.Maestro);
        // Mismo patrón que el interceptor de auditoría para resolver el id del usuario
        var identityUserId = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value
            ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

        var result = await service.ObtenerAsync(limite, esMaestro, identityUserId);
        return Ok(result.Data);
    }
}
