using System.Security.Claims;
using CajaMenor.Application.DTOs;
using CajaMenor.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CajaMenor.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class CajaMenorController(ICajaMenorService service) : ControllerBase
{
    [HttpGet("mia")]
    public async Task<IActionResult> ObtenerMiCaja()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var result = await service.ObtenerPorUsuarioAsync(userId!);
        if (!result.Success) return NotFound(new { message = result.Error });
        return Ok(result.Data);
    }

    [HttpGet("{cajaId}/dashboard")]
    public async Task<IActionResult> ObtenerDashboard(int cajaId)
    {
        try
        {
            var result = await service.ObtenerDashboardAsync(cajaId);
            if (!result.Success) return NotFound(new { message = result.Error });
            return Ok(result.Data);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error interno", detail = ex.Message, inner = ex.InnerException?.Message });
        }
    }

    [HttpPost]
    [Authorize(Roles = "Director")]
    public async Task<IActionResult> Crear([FromBody] CrearCajaMenorDto dto)
    {
        var result = await service.CrearAsync(dto);
        if (!result.Success) return BadRequest(new { message = result.Error });
        return CreatedAtAction(nameof(ObtenerDashboard), new { cajaId = result.Data!.Id }, result.Data);
    }
}
