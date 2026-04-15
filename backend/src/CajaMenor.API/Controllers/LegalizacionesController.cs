using CajaMenor.Application.DTOs;
using CajaMenor.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CajaMenor.API.Controllers;

[ApiController]
[Route("api/cajas/{cajaId}/[controller]")]
[Authorize]
public class LegalizacionesController(ILegalizacionService service) : ControllerBase
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

    [HttpGet("{id}")]
    public async Task<IActionResult> ObtenerPorId(int cajaId, int id)
    {
        var result = await service.ObtenerPorIdAsync(id);
        if (!result.Success) return NotFound(new { message = result.Error });
        return Ok(result.Data);
    }

    [HttpPost]
    [Authorize(Roles = "Administrador")]
    public async Task<IActionResult> Crear(int cajaId, [FromBody] CrearLegalizacionDto dto)
    {
        dto.CajaId = cajaId;
        var result = await service.CrearAsync(dto);
        if (!result.Success) return BadRequest(new { message = result.Error });
        return CreatedAtAction(nameof(ObtenerPorId), new { cajaId, id = result.Data!.Id }, result.Data);
    }

    [HttpPost("{id}/reembolsar")]
    [Authorize(Roles = "Administrador")]
    public async Task<IActionResult> IniciarReembolso(int cajaId, int id)
    {
        var result = await service.IniciarReembolsoAsync(id);
        if (!result.Success) return BadRequest(new { message = result.Error });
        return Ok(result.Data);
    }

    [HttpPost("{id}/recibos")]
    [Authorize(Roles = "Administrador")]
    public async Task<IActionResult> SubirRecibo(int cajaId, int id, IFormFile archivo)
    {
        if (archivo is null || archivo.Length == 0)
            return BadRequest(new { message = "Debe adjuntar un archivo" });

        var ext = Path.GetExtension(archivo.FileName).ToLowerInvariant();
        var permitidos = new[] { ".jpg", ".jpeg", ".png", ".gif", ".webp", ".pdf" };
        if (!permitidos.Contains(ext))
            return BadRequest(new { message = "Formato no permitido. Use JPG, PNG, GIF, WEBP o PDF" });

        var uploadDir = Path.Combine("uploads", "recibos");
        Directory.CreateDirectory(uploadDir);
        var fileName = $"leg_{id}_{Guid.NewGuid()}{ext}";
        var filePath = Path.Combine(uploadDir, fileName);

        using var stream = System.IO.File.Create(filePath);
        await archivo.CopyToAsync(stream);

        var result = await service.SubirReciboAsync(id, archivo.FileName, filePath);
        if (!result.Success) return BadRequest(new { message = result.Error });
        return Ok(result.Data);
    }

    [HttpDelete("{id}/recibos/{reciboId}")]
    [Authorize(Roles = "Administrador")]
    public async Task<IActionResult> EliminarRecibo(int cajaId, int id, int reciboId)
    {
        var result = await service.EliminarReciboAsync(reciboId);
        if (!result.Success) return BadRequest(new { message = result.Error });
        return Ok(new { message = "Recibo eliminado" });
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Administrador")]
    public async Task<IActionResult> Editar(int cajaId, int id, [FromBody] EditarLegalizacionDto dto)
    {
        var result = await service.EditarAsync(id, dto);
        if (!result.Success) return BadRequest(new { message = result.Error });
        return Ok(result.Data);
    }
}
