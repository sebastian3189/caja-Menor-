using System.Security.Claims;
using CajaMenor.Application.DTOs;
using CajaMenor.Application.Interfaces;
using CajaMenor.Domain.Enums;
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

    /// <summary>Lista todas las cajas del sistema (todas las centrales). Solo Maestro.</summary>
    [HttpGet]
    [Authorize(Roles = RolUsuario.Maestro)]
    public async Task<IActionResult> ListarTodas()
    {
        var result = await service.ListarTodasAsync();
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
    [Authorize(Roles = $"{RolUsuario.Director},{RolUsuario.Maestro}")]
    public async Task<IActionResult> Crear([FromBody] CrearCajaMenorDto dto)
    {
        var result = await service.CrearAsync(dto);
        if (!result.Success) return BadRequest(new { message = result.Error });
        return CreatedAtAction(nameof(ObtenerDashboard), new { cajaId = result.Data!.Id }, result.Data);
    }

    /// <summary>Edita nombre, central, director y (solo si no tiene movimientos) el valor de apertura. Solo Maestro.</summary>
    [HttpPut("{id}")]
    [Authorize(Roles = RolUsuario.Maestro)]
    public async Task<IActionResult> Editar(int id, [FromBody] EditarCajaMenorDto dto)
    {
        var result = await service.EditarAsync(id, dto);
        if (!result.Success) return BadRequest(new { message = result.Error });
        return Ok(result.Data);
    }

    /// <summary>Elimina una caja sin movimientos registrados. Solo Maestro.</summary>
    [HttpDelete("{id}")]
    [Authorize(Roles = RolUsuario.Maestro)]
    public async Task<IActionResult> Eliminar(int id)
    {
        var result = await service.EliminarAsync(id);
        if (!result.Success) return BadRequest(new { message = result.Error });
        return Ok(new { message = "Caja eliminada." });
    }

    /// <summary>Cierra la caja: bloquea si hay avances pendientes o legalizaciones sin reembolso confirmado.</summary>
    [HttpPost("{id}/cerrar")]
    [Authorize(Roles = $"{RolUsuario.Director},{RolUsuario.Maestro}")]
    public async Task<IActionResult> Cerrar(int id)
    {
        var result = await service.CerrarAsync(id);
        if (!result.Success) return BadRequest(new { message = result.Error });
        return Ok(result.Data);
    }

    /// <summary>Reabre una caja previamente cerrada.</summary>
    [HttpPost("{id}/reabrir")]
    [Authorize(Roles = $"{RolUsuario.Director},{RolUsuario.Maestro}")]
    public async Task<IActionResult> Reabrir(int id)
    {
        var result = await service.ReabrirAsync(id);
        if (!result.Success) return BadRequest(new { message = result.Error });
        return Ok(result.Data);
    }
}
