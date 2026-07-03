using CajaMenor.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CajaMenor.API.Controllers;

/// <summary>
/// Endpoints que Tesorería abre desde el correo (enlaces Aceptar/Denegar). Son anónimos y se
/// autorizan por el token único del arqueo. Devuelven una página HTML de confirmación.
/// </summary>
[ApiController]
[Route("api/[controller]")]
[AllowAnonymous]
public class TesoreriaController(IArqueoService service) : ControllerBase
{
    [HttpGet("{token}/aceptar")]
    public Task<IActionResult> Aceptar(string token) => Responder(token, aceptar: true);

    [HttpGet("{token}/denegar")]
    public Task<IActionResult> Denegar(string token) => Responder(token, aceptar: false);

    private async Task<IActionResult> Responder(string token, bool aceptar)
    {
        var result = await service.ResponderTesoreriaAsync(token, aceptar);
        var ok = result.Success;
        var mensaje = ok ? result.Data! : (result.Error ?? "No se pudo procesar la solicitud.");
        var titulo = ok ? (aceptar ? "Arqueo aceptado" : "Arqueo denegado") : "Solicitud no válida";
        var color = !ok ? "#dc2626" : (aceptar ? "#16a34a" : "#dc2626");

        return new ContentResult
        {
            ContentType = "text/html; charset=utf-8",
            StatusCode = ok ? 200 : 400,
            Content = $"""
                <!doctype html><html lang="es"><head><meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <title>{titulo} — Caja Menor</title></head>
                <body style="font-family:Arial,sans-serif;background:#f1f5f9;margin:0;padding:40px">
                  <div style="max-width:480px;margin:auto;background:#fff;border-radius:16px;padding:32px;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,.06)">
                    <h1 style="color:{color};margin:0 0 12px">{titulo}</h1>
                    <p style="color:#334155;font-size:15px;line-height:1.5">{mensaje}</p>
                    <p style="color:#94a3b8;font-size:12px;margin-top:24px">Sistema de Gestión de Caja Menor — MiraxionTech</p>
                  </div>
                </body></html>
                """
        };
    }
}
