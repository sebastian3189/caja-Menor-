using CajaMenor.Application.DTOs;
using CajaMenor.Application.Interfaces;
using CajaMenor.Domain.Enums;
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

    /// <summary>Crea una nueva central. Solo Maestro.</summary>
    [HttpPost]
    [Authorize(Roles = RolUsuario.Maestro)]
    public async Task<IActionResult> Crear([FromBody] CrearCentralDto dto)
    {
        var result = await service.CrearAsync(dto);
        if (!result.Success) return BadRequest(new { message = result.Error });
        return CreatedAtAction(nameof(Listar), result.Data);
    }

    /// <summary>Edita nombre/código de una central. Solo Maestro.</summary>
    [HttpPut("{id}")]
    [Authorize(Roles = RolUsuario.Maestro)]
    public async Task<IActionResult> Editar(int id, [FromBody] EditarCentralDto dto)
    {
        var result = await service.EditarAsync(id, dto);
        if (!result.Success) return BadRequest(new { message = result.Error });
        return Ok(result.Data);
    }

    /// <summary>Elimina una central sin usuarios ni cajas. Solo Maestro.</summary>
    [HttpDelete("{id}")]
    [Authorize(Roles = RolUsuario.Maestro)]
    public async Task<IActionResult> Eliminar(int id)
    {
        var result = await service.EliminarAsync(id);
        if (!result.Success) return BadRequest(new { message = result.Error });
        return Ok(new { message = "Central eliminada." });
    }
}
