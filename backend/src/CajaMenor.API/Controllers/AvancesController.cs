using CajaMenor.Application.DTOs;
using CajaMenor.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CajaMenor.API.Controllers;

[ApiController]
[Route("api/cajas/{cajaId}/[controller]")]
[Authorize]
public class AvancesController(IAvanceService service) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Obtener(int cajaId)
    {
        var result = await service.ObtenerPorCajaAsync(cajaId);
        return Ok(result.Data);
    }

    [HttpGet("resumen")]
    public async Task<IActionResult> Resumen(int cajaId)
    {
        var result = await service.ObtenerResumenAsync(cajaId);
        return Ok(result.Data);
    }

    [HttpGet("pendientes")]
    public async Task<IActionResult> Pendientes(int cajaId)
    {
        var result = await service.ObtenerPendientesAsync(cajaId);
        return Ok(result.Data);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> ObtenerPorId(int cajaId, int id)
    {
        var result = await service.ObtenerPorIdAsync(id);
        if (!result.Success) return NotFound(new { message = result.Error });
        return Ok(result.Data);
    }

    [HttpPost]
    [Authorize(Roles = "Administrador")]
    public async Task<IActionResult> Crear(int cajaId, [FromBody] CrearAvanceDto dto)
    {
        dto.CajaId = cajaId;
        var result = await service.CrearAsync(dto);
        if (!result.Success) return BadRequest(new { message = result.Error });
        return CreatedAtAction(nameof(ObtenerPorId), new { cajaId, id = result.Data!.Id }, result.Data);
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Administrador")]
    public async Task<IActionResult> Editar(int cajaId, int id, [FromBody] EditarAvanceDto dto)
    {
        var result = await service.EditarAsync(id, dto);
        if (!result.Success) return BadRequest(new { message = result.Error });
        return Ok(result.Data);
    }
}
