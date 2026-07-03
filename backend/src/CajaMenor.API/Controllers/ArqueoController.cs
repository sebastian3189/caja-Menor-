using CajaMenor.Application.Interfaces;
using CajaMenor.API.Services;
using CajaMenor.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace CajaMenor.API.Controllers;

[ApiController]
[Route("api/cajas/{cajaId}/[controller]")]
[Authorize]
public class ArqueoController(IArqueoService service) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Obtener(int cajaId)
    {
        var result = await service.ObtenerArqueoActivoAsync(cajaId);
        if (!result.Success) return NotFound(new { message = result.Error });
        return Ok(result.Data);
    }

    [HttpPost("generar")]
    [Authorize(Roles = "Administrador")]
    public async Task<IActionResult> Generar(int cajaId)
    {
        var result = await service.GenerarArqueoAsync(cajaId);
        if (!result.Success) return BadRequest(new { message = result.Error });
        return Ok(result.Data);
    }

    [HttpPost("firma-directivo")]
    [Authorize(Roles = "Director")]
    public async Task<IActionResult> SubirFirmaDirectivo(int cajaId, IFormFile firma)
    {
        var errorFirma = UploadValidator.Validar(firma);
        if (errorFirma is not null) return BadRequest(new { message = errorFirma });

        var uploadDir = Path.Combine("uploads", "firmas");
        Directory.CreateDirectory(uploadDir);
        var fileName = $"director_{cajaId}_{Guid.NewGuid()}{UploadValidator.ExtensionSegura(firma)}";
        var filePath = Path.Combine(uploadDir, fileName);

        using var stream = System.IO.File.Create(filePath);
        await firma.CopyToAsync(stream);

        var result = await service.SubirFirmaDirectivoAsync(cajaId, filePath);
        if (!result.Success) return BadRequest(new { message = result.Error });
        return Ok(new { message = "Firma del directivo registrada", ruta = filePath });
    }

    [HttpPost("firma-administrador")]
    [Authorize(Roles = "Administrador")]
    public async Task<IActionResult> SubirFirmaAdministrador(int cajaId, IFormFile firma)
    {
        var errorFirma = UploadValidator.Validar(firma);
        if (errorFirma is not null) return BadRequest(new { message = errorFirma });

        var uploadDir = Path.Combine("uploads", "firmas");
        Directory.CreateDirectory(uploadDir);
        var fileName = $"admin_{cajaId}_{Guid.NewGuid()}{UploadValidator.ExtensionSegura(firma)}";
        var filePath = Path.Combine(uploadDir, fileName);

        using var stream = System.IO.File.Create(filePath);
        await firma.CopyToAsync(stream);

        var result = await service.SubirFirmaAdministradorAsync(cajaId, filePath);
        if (!result.Success) return BadRequest(new { message = result.Error });
        return Ok(new { message = "Firma del administrador registrada", ruta = filePath });
    }

    [HttpDelete("firma-directivo")]
    [Authorize(Roles = "Director")]
    public async Task<IActionResult> EliminarFirmaDirectivo(int cajaId)
    {
        var result = await service.EliminarFirmaDirectivoAsync(cajaId);
        if (!result.Success) return BadRequest(new { message = result.Error });
        return Ok(new { message = "Firma del directivo eliminada" });
    }

    [HttpDelete("firma-administrador")]
    [Authorize(Roles = "Administrador")]
    public async Task<IActionResult> EliminarFirmaAdministrador(int cajaId)
    {
        var result = await service.EliminarFirmaAdministradorAsync(cajaId);
        if (!result.Success) return BadRequest(new { message = result.Error });
        return Ok(new { message = "Firma del administrador eliminada" });
    }

    [HttpPost("enviar-tesoreria")]
    [Authorize(Roles = "Administrador")]
    public async Task<IActionResult> EnviarTesoreria(int cajaId)
    {
        var result = await service.EnviarATesoreriaAsync(cajaId);
        if (!result.Success) return BadRequest(new { message = result.Error });
        return Ok(new { message = "Arqueo enviado a Tesorería exitosamente" });
    }

    [HttpGet("pdf")]
    public async Task<IActionResult> DescargarPdf(int cajaId)
    {
        var result = await service.GenerarPdfArqueoAsync(cajaId);
        if (!result.Success) return NotFound(new { message = result.Error });
        return File(result.Data!, "application/pdf", $"Arqueo_Caja_{cajaId}.pdf");
    }
}
