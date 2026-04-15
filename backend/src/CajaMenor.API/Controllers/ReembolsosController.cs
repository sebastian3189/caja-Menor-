using CajaMenor.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CajaMenor.API.Controllers;

[ApiController]
[Route("api/cajas/{cajaId}/[controller]")]
[Authorize]
public class ReembolsosController(IReembolsoService service) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Obtener(int cajaId)
    {
        var result = await service.ObtenerPorCajaAsync(cajaId);
        return Ok(result.Data);
    }

    [HttpPost("activar")]
    [Authorize(Roles = "Director,Administrador")]
    public async Task<IActionResult> Activar(int cajaId)
    {
        var result = await service.ActivarReembolsosAsync(cajaId);
        if (!result.Success) return BadRequest(new { message = result.Error });
        return Ok(new { message = "Reembolsos activados. Estado: En Proceso" });
    }

    [HttpPost("confirmar")]
    [Authorize(Roles = "Director")]
    public async Task<IActionResult> Confirmar(int cajaId)
    {
        var result = await service.ConfirmarReembolsosAsync(cajaId);
        if (!result.Success) return BadRequest(new { message = result.Error });
        return Ok(new { message = "Reembolsos confirmados exitosamente" });
    }

    [HttpDelete("{reembolsoId}/cancelar")]
    [Authorize(Roles = "Director")]
    public async Task<IActionResult> Cancelar(int cajaId, int reembolsoId)
    {
        var result = await service.CancelarAsync(reembolsoId);
        if (!result.Success) return BadRequest(new { message = result.Error });
        return Ok(new { message = "Reembolso cancelado. La legalización volvió a estado Sin Reembolso." });
    }
}
