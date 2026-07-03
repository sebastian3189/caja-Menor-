using CajaMenor.Application.DTOs;
using CajaMenor.Application.Interfaces;
using CajaMenor.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CajaMenor.API.Controllers;

[ApiController]
[Route("api/cajas/{cajaId}/[controller]")]
[Authorize]
public class AvancesController(IAvanceService service) : ControllerBase
{
    private const string XlsxMime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    [HttpGet]
    public async Task<IActionResult> Obtener(int cajaId)
    {
        var result = await service.ObtenerPorCajaAsync(cajaId);
        return Ok(result.Data);
    }

    [HttpGet("exportar")]
    public async Task<IActionResult> Exportar(int cajaId)
    {
        var result = await service.ObtenerPorCajaAsync(cajaId);
        var avances = result.Data ?? new List<AvanceDto>();
        var nombreCaja = avances.FirstOrDefault()?.NombreCaja ?? $"Caja {cajaId}";
        var bytes = ExcelExporter.Avances(avances, nombreCaja);
        var fileName = $"Avances_{DateTime.Now:yyyyMMdd_HHmm}.xlsx";
        return File(bytes, XlsxMime, fileName);
    }

    /// <summary>Genera el PDF (comprobante) de un avance.</summary>
    [HttpGet("{id}/pdf")]
    public async Task<IActionResult> DescargarPdf(int cajaId, int id)
    {
        var result = await service.GenerarPdfAsync(id);
        if (!result.Success) return NotFound(new { message = result.Error });
        return File(result.Data!, "application/pdf", $"Avance_{id}.pdf");
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

    [HttpGet("siguiente-codigo")]
    [Authorize(Roles = "Administrador")]
    public async Task<IActionResult> SiguienteCodigo(int cajaId)
    {
        var result = await service.ObtenerSiguienteCodigoAsync(cajaId);
        return Ok(new { codigo = result.Data });
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

    [HttpDelete("{id}")]
    [Authorize(Roles = "Administrador")]
    public async Task<IActionResult> Eliminar(int cajaId, int id)
    {
        var result = await service.EliminarAsync(id);
        if (!result.Success) return BadRequest(new { message = result.Error });
        return Ok(new { message = "Avance eliminado correctamente" });
    }
}
