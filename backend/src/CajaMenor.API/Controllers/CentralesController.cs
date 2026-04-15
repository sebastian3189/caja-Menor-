using CajaMenor.Application.DTOs;
using CajaMenor.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CajaMenor.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class CentralesController(ICentralService service) : ControllerBase
{
    /// <summary>Lista todas las centrales con cantidad de usuarios y cajas.</summary>
    [HttpGet]
    public async Task<IActionResult> Listar()
    {
        var result = await service.ListarAsync();
        return Ok(result.Data);
    }

    /// <summary>Crea una nueva central. Solo Director.</summary>
    [HttpPost]
    [Authorize(Roles = "Director")]
    public async Task<IActionResult> Crear([FromBody] CrearCentralDto dto)
    {
        var result = await service.CrearAsync(dto);
        if (!result.Success) return BadRequest(new { message = result.Error });
        return CreatedAtAction(nameof(Listar), result.Data);
    }

    /// <summary>Elimina una central sin usuarios ni cajas. Solo Director.</summary>
    [HttpDelete("{id}")]
    [Authorize(Roles = "Director")]
    public async Task<IActionResult> Eliminar(int id)
    {
        var result = await service.EliminarAsync(id);
        if (!result.Success) return BadRequest(new { message = result.Error });
        return Ok(new { message = "Central eliminada." });
    }
}
