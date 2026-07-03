using System.Security.Claims;
using CajaMenor.Application.DTOs;
using CajaMenor.Application.Interfaces;
using CajaMenor.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CajaMenor.API.Controllers;

[ApiController]
[Authorize]
public class SolicitudesController(ISolicitudAvanceService service) : ControllerBase
{
    // ── Solicitante ──

    /// <summary>El Solicitante crea una solicitud de avance para su caja asignada.</summary>
    [HttpPost("api/solicitudes")]
    [Authorize(Roles = RolUsuario.Solicitante)]
    public async Task<IActionResult> Crear([FromBody] CrearSolicitudAvanceDto dto)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var result = await service.CrearAsync(userId, dto);
        if (!result.Success) return BadRequest(new { message = result.Error });
        return Ok(result.Data);
    }

    /// <summary>Solicitudes del propio Solicitante autenticado.</summary>
    [HttpGet("api/solicitudes/mias")]
    [Authorize(Roles = RolUsuario.Solicitante)]
    public async Task<IActionResult> Mias()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var result = await service.ObtenerMiasAsync(userId);
        if (!result.Success) return BadRequest(new { message = result.Error });
        return Ok(result.Data);
    }

    // ── Administrador (por caja) ──

    /// <summary>Todas las solicitudes de una caja.</summary>
    [HttpGet("api/cajas/{cajaId}/solicitudes")]
    [Authorize(Roles = RolUsuario.Administrador)]
    public async Task<IActionResult> PorCaja(int cajaId)
    {
        var result = await service.ObtenerPorCajaAsync(cajaId);
        return Ok(result.Data);
    }

    /// <summary>Solicitudes pendientes de una caja (fuente de la notificación al Administrador).</summary>
    [HttpGet("api/cajas/{cajaId}/solicitudes/pendientes")]
    [Authorize(Roles = RolUsuario.Administrador)]
    public async Task<IActionResult> Pendientes(int cajaId)
    {
        var result = await service.ObtenerPendientesPorCajaAsync(cajaId);
        return Ok(result.Data);
    }

    /// <summary>Acepta la solicitud: genera el avance correspondiente.</summary>
    [HttpPost("api/cajas/{cajaId}/solicitudes/{id}/aceptar")]
    [Authorize(Roles = RolUsuario.Administrador)]
    public async Task<IActionResult> Aceptar(int cajaId, int id)
    {
        var result = await service.AceptarAsync(id);
        if (!result.Success) return BadRequest(new { message = result.Error });
        return Ok(result.Data);
    }

    /// <summary>Rechaza la solicitud con un motivo opcional.</summary>
    [HttpPost("api/cajas/{cajaId}/solicitudes/{id}/rechazar")]
    [Authorize(Roles = RolUsuario.Administrador)]
    public async Task<IActionResult> Rechazar(int cajaId, int id, [FromBody] RechazarSolicitudDto dto)
    {
        var result = await service.RechazarAsync(id, dto.Motivo);
        if (!result.Success) return BadRequest(new { message = result.Error });
        return Ok(result.Data);
    }

    /// <summary>Solicitantes asignados a la caja (para el desplegable del formulario de avance).</summary>
    [HttpGet("api/cajas/{cajaId}/solicitantes")]
    [Authorize(Roles = RolUsuario.Administrador)]
    public async Task<IActionResult> SolicitantesDeCaja(int cajaId)
    {
        var result = await service.ObtenerSolicitantesDeCajaAsync(cajaId);
        if (!result.Success) return BadRequest(new { message = result.Error });
        return Ok(result.Data);
    }
}
