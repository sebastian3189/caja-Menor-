using CajaMenor.Application.DTOs;
using CajaMenor.Application.Interfaces;
using CajaMenor.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CajaMenor.API.Controllers;

[ApiController]
[Route("api/cajas/{cajaId}/[controller]")]
[Authorize]
public class LegalizacionesController(ILegalizacionService service, IOCRService ocrService, IConfiguration config) : ControllerBase
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
        var legalizaciones = result.Data ?? new List<LegalizacionDto>();
        var nombreCaja = legalizaciones.FirstOrDefault()?.NombreCaja ?? $"Caja {cajaId}";
        var bytes = ExcelExporter.Legalizaciones(legalizaciones, nombreCaja);
        var fileName = $"Legalizaciones_{DateTime.Now:yyyyMMdd_HHmm}.xlsx";
        return File(bytes, XlsxMime, fileName);
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

    [HttpGet("siguiente-codigo")]
    [Authorize(Roles = "Administrador")]
    public async Task<IActionResult> SiguienteCodigo(int cajaId)
    {
        var result = await service.ObtenerSiguienteCodigoAsync(cajaId);
        return Ok(new { codigo = result.Data });
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
        var errorValidacion = UploadValidator.Validar(archivo);
        if (errorValidacion is not null)
            return BadRequest(new { message = errorValidacion });

        var ext = UploadValidator.ExtensionSegura(archivo);
        var uploadDir = Path.Combine("uploads", "recibos");
        Directory.CreateDirectory(uploadDir);
        var fileName = $"leg_{id}_{Guid.NewGuid()}{ext}"; // S-11: nombre siempre por GUID
        var filePath = Path.Combine(uploadDir, fileName);

        // Guardar archivo temporalmente para OCR
        using (var stream = System.IO.File.Create(filePath))
            await archivo.CopyToAsync(stream);

        // --- Análisis OCR ---
        decimal? valorOcr = null;
        bool validadoOcr = false;
        string? notaOcr = null;

        var habilitarValidacion = config.GetValue<bool>("OCR:HabilitarValidacion", true);
        var rechazarSiNoDetecta = config.GetValue<bool>("OCR:RechazarSiNoDetecta", false);
        var toleranciaPorc = config.GetValue<decimal>("OCR:ToleranciaPorc", 2m) / 100m;

        if (habilitarValidacion)
        {
            using var fileStream = System.IO.File.OpenRead(filePath);
            var ocrResult = await ocrService.ExtraerMontoFacturaAsync(fileStream, ext);

            if (ocrResult.Exitoso && ocrResult.MontoExtraido.HasValue)
            {
                valorOcr = ocrResult.MontoExtraido;
                notaOcr = ocrResult.TextoCompleto;

                // Obtener legalización con sus recibos existentes
                var legResult = await service.ObtenerPorIdAsync(id);
                if (legResult.Success)
                {
                    var montoLegalizado = legResult.Data!.Monto;

                    // Sumar netos OCR de recibos ya cargados + el nuevo
                    var sumaExistente = legResult.Data.Recibos
                        .Where(r => r.ValorOCR.HasValue)
                        .Sum(r => r.ValorOCR!.Value);
                    var sumaTotal = sumaExistente + ocrResult.MontoExtraido.Value;

                    var diferencia = Math.Abs(sumaTotal - montoLegalizado);
                    var umbral = montoLegalizado * toleranciaPorc;

                    if (sumaTotal > montoLegalizado + umbral)
                    {
                        // Suma excede el monto: rechazar y eliminar archivo
                        if (System.IO.File.Exists(filePath))
                            System.IO.File.Delete(filePath);

                        return UnprocessableEntity(new
                        {
                            message = $"La suma de facturas ({sumaTotal:C}) supera el monto legalizado ({montoLegalizado:C}). Diferencia: {diferencia:C}",
                            valorOCR = sumaTotal,
                            montoLegalizado,
                            diferencia
                        });
                    }

                    // Validado solo cuando la suma alcanza el monto dentro del umbral
                    if (diferencia <= umbral)
                        validadoOcr = true;
                }
            }
            else if (rechazarSiNoDetecta)
            {
                if (System.IO.File.Exists(filePath))
                    System.IO.File.Delete(filePath);
                return UnprocessableEntity(new { message = "No se pudo verificar el monto de la factura automáticamente. Adjunte una imagen más clara." });
            }
            else
            {
                notaOcr = ocrResult.Error ?? "Monto no detectado automáticamente";
            }
        }

        var result = await service.SubirReciboAsync(id, archivo.FileName, filePath, valorOcr, validadoOcr, notaOcr);
        if (!result.Success) return BadRequest(new { message = result.Error });
        return Ok(result.Data);
    }

    [HttpPost("{id}/recibos/batch")]
    [Authorize(Roles = "Administrador")]
    public async Task<IActionResult> SubirRecibos(int cajaId, int id, [FromForm] IFormFileCollection archivos)
    {
        if (archivos == null || archivos.Count == 0)
            return BadRequest(new { message = "Debe adjuntar al menos un archivo" });

        // S-03/S-10/S-11: validar cada archivo (extensión, content-type, tamaño)
        foreach (var archivo in archivos)
        {
            var error = UploadValidator.Validar(archivo);
            if (error is not null) return BadRequest(new { message = error });
        }

        var legResult = await service.ObtenerPorIdAsync(id);
        if (!legResult.Success) return NotFound(new { message = "Legalización no encontrada" });
        var montoLegalizado = legResult.Data!.Monto;

        var habilitarValidacion = config.GetValue<bool>("OCR:HabilitarValidacion", true);
        var rechazarSiNoDetecta = config.GetValue<bool>("OCR:RechazarSiNoDetecta", true);
        var toleranciaPorc = config.GetValue<decimal>("OCR:ToleranciaPorc", 5m) / 100m;

        var uploadDir = Path.Combine("uploads", "recibos");
        Directory.CreateDirectory(uploadDir);

        var staged = new List<(string FilePath, string Nombre, decimal? ValorOcr, string? NotaOcr)>();

        try
        {
            foreach (var archivo in archivos)
            {
                var ext = UploadValidator.ExtensionSegura(archivo);
                var filePath = Path.Combine(uploadDir, $"leg_{id}_{Guid.NewGuid()}{ext}");

                using (var fs = System.IO.File.Create(filePath))
                    await archivo.CopyToAsync(fs);

                decimal? valorOcr = null;
                string? notaOcr = null;

                if (habilitarValidacion)
                {
                    using var fs2 = System.IO.File.OpenRead(filePath);
                    var ocr = await ocrService.ExtraerMontoFacturaAsync(fs2, ext);
                    valorOcr = ocr.Exitoso ? ocr.MontoExtraido : null;
                    notaOcr = ocr.Exitoso ? ocr.TextoCompleto : (ocr.Error ?? "No se detectó monto");
                }

                staged.Add((filePath, archivo.FileName, valorOcr, notaOcr));
            }

            // Validar suma de netos OCR vs monto legalizado
            bool sumaValida = false;
            if (habilitarValidacion)
            {
                var sinOcr = staged.Where(s => !s.ValorOcr.HasValue).ToList();
                var conOcr = staged.Where(s => s.ValorOcr.HasValue).ToList();

                // Rechazar si algún archivo no pudo ser analizado
                if (rechazarSiNoDetecta && sinOcr.Count > 0)
                {
                    foreach (var s in staged)
                        if (System.IO.File.Exists(s.FilePath)) System.IO.File.Delete(s.FilePath);

                    var nombres = string.Join(", ", sinOcr.Select(s => s.Nombre));
                    return UnprocessableEntity(new
                    {
                        message = $"No se pudo leer el monto en: {nombres}. Asegúrese de que la imagen esté nítida y contenga el valor total visible.",
                        valorOCR = 0m,
                        montoLegalizado,
                        diferencia = montoLegalizado
                    });
                }

                if (conOcr.Count > 0)
                {
                    var sumaOcr = conOcr.Sum(s => s.ValorOcr!.Value);
                    var diferencia = Math.Abs(sumaOcr - montoLegalizado);
                    var umbral = montoLegalizado * toleranciaPorc;

                    if (diferencia > umbral)
                    {
                        foreach (var s in staged)
                            if (System.IO.File.Exists(s.FilePath)) System.IO.File.Delete(s.FilePath);

                        return UnprocessableEntity(new
                        {
                            message = $"La suma de los netos ({sumaOcr:C}) no coincide con el monto legalizado ({montoLegalizado:C}). Diferencia: {diferencia:C}. Intente de nuevo con las facturas correctas.",
                            valorOCR = sumaOcr,
                            montoLegalizado,
                            diferencia
                        });
                    }

                    sumaValida = true;
                }
            }

            // Persistir todos
            var recibos = new List<ReciboDto>();
            foreach (var (path, nombre, valorOcr, notaOcr) in staged)
            {
                bool validado = sumaValida && valorOcr.HasValue;
                var result = await service.SubirReciboAsync(id, nombre, path, valorOcr, validado, notaOcr);
                if (result.Success) recibos.Add(result.Data!);
            }

            return Ok(recibos);
        }
        catch
        {
            foreach (var s in staged)
                if (System.IO.File.Exists(s.FilePath)) System.IO.File.Delete(s.FilePath);
            throw;
        }
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
