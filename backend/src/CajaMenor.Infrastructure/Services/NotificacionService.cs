using CajaMenor.Application.Common;
using CajaMenor.Application.Interfaces;
using MailKit.Net.Smtp;
using MimeKit;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace CajaMenor.Infrastructure.Services;

public class NotificacionService(IConfiguration config, ILogger<NotificacionService> logger) : INotificacionService
{
    public async Task<Result> EnviarArqueoTesoreriaAsync(string destinatario, string nombreCaja, string director, string administrador, byte[] pdfAdjunto, string urlAceptar, string urlDenegar)
    {
        var smtpHost = config["Email:SmtpHost"] ?? "smtp.gmail.com";
        var smtpPort = int.Parse(config["Email:SmtpPort"] ?? "587");
        var smtpUser = config["Email:Usuario"] ?? "";
        var smtpPass = config["Email:Password"] ?? "";
        var remitente = config["Email:Remitente"];
        if (string.IsNullOrWhiteSpace(remitente)) remitente = smtpUser;

        if (string.IsNullOrWhiteSpace(smtpUser) || string.IsNullOrWhiteSpace(smtpPass))
        {
            logger.LogWarning("SMTP sin credenciales. No se envió el arqueo a Tesorería ({Destinatario}).", destinatario);
            return Result.Fail("Correo no configurado: falta la cuenta remitente (Email:Usuario/Password).");
        }

        try
        {
            var message = new MimeMessage();
            message.From.Add(new MailboxAddress("Sistema Caja Menor", remitente));
            message.To.Add(new MailboxAddress("Tesorería", destinatario));
            message.Subject = $"Arqueo Caja Menor {nombreCaja} — requiere su aprobación";

            var bodyBuilder = new BodyBuilder
            {
                TextBody = $"Caja Menor: {nombreCaja}\nDirector Encargado: {director}\nAdministradora Encargada: {administrador}\n\n" +
                           $"Se adjunta el arqueo para su revisión.\n\nAceptar: {urlAceptar}\nDenegar: {urlDenegar}",
                HtmlBody = $"""
                    <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#1f2937">
                      <h2 style="color:#0f766e">Arqueo de Caja Menor</h2>
                      <p><b>Caja:</b> {nombreCaja}<br>
                         <b>Director:</b> {director}<br>
                         <b>Administrador(es):</b> {administrador}</p>
                      <p>Se adjunta el arqueo en PDF para su revisión y aprobación del reembolso.</p>
                      <p style="text-align:center;margin:28px 0">
                        <a href="{urlAceptar}" style="background:#16a34a;color:#fff;padding:12px 26px;border-radius:8px;text-decoration:none;display:inline-block;margin:0 6px">Aceptar</a>
                        <a href="{urlDenegar}" style="background:#dc2626;color:#fff;padding:12px 26px;border-radius:8px;text-decoration:none;display:inline-block;margin:0 6px">Denegar</a>
                      </p>
                      <p style="font-size:12px;color:#6b7280">Si los botones no funcionan, copia estos enlaces:<br>
                         Aceptar: {urlAceptar}<br>Denegar: {urlDenegar}</p>
                    </div>
                    """
            };
            bodyBuilder.Attachments.Add($"Arqueo_{nombreCaja.Replace(" ", "_")}.pdf", pdfAdjunto, new ContentType("application", "pdf"));
            message.Body = bodyBuilder.ToMessageBody();

            using var client = new SmtpClient();
            await client.ConnectAsync(smtpHost, smtpPort, MailKit.Security.SecureSocketOptions.StartTls);
            await client.AuthenticateAsync(smtpUser, smtpPass);
            await client.SendAsync(message);
            await client.DisconnectAsync(true);

            logger.LogInformation("Arqueo enviado a Tesorería ({Destinatario}) vía {Host}", destinatario, smtpHost);
            return Result.Ok();
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error al enviar arqueo a Tesorería ({Destinatario}) vía {Host}:{Port}", destinatario, smtpHost, smtpPort);
            return Result.Fail($"Error al enviar correo: {ex.Message}");
        }
    }

    public async Task<Result> EnviarAvanceSolicitanteAsync(string destinatario, string nombre, string codigoAvance, decimal valorAvance, byte[] pdfAdjunto)
    {
        var smtpHost = config["Email:SmtpHost"] ?? "smtp.gmail.com";
        var smtpPort = int.Parse(config["Email:SmtpPort"] ?? "587");
        var smtpUser = config["Email:Usuario"] ?? "";
        var smtpPass = config["Email:Password"] ?? "";
        var remitente = config["Email:Remitente"];
        if (string.IsNullOrWhiteSpace(remitente)) remitente = smtpUser;

        if (string.IsNullOrWhiteSpace(smtpUser) || string.IsNullOrWhiteSpace(smtpPass))
        {
            logger.LogWarning("SMTP sin credenciales. No se envió el avance {Codigo} a {Destinatario}.", codigoAvance, destinatario);
            return Result.Fail("Correo no configurado: falta la cuenta remitente (Email:Usuario/Password).");
        }

        try
        {
            var message = new MimeMessage();
            message.From.Add(new MailboxAddress("Sistema Caja Menor", remitente));
            message.To.Add(new MailboxAddress(nombre, destinatario));
            message.Subject = $"Avance {codigoAvance} — firma y validación de entrega";

            var bodyBuilder = new BodyBuilder
            {
                TextBody = $"Hola {nombre},\n\nSe hace envío del documento del avance {codigoAvance} por valor de {valorAvance:C} " +
                           "para su firma y validación de la entrega de los recursos.\n\nAdjunto encontrará el comprobante en PDF.",
                HtmlBody = $"""
                    <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#1f2937">
                      <h2 style="color:#0f766e">Documento de avance</h2>
                      <p>Hola <b>{nombre}</b>,</p>
                      <p>Se hace envío del documento del avance <b>{codigoAvance}</b> por valor de
                         <b>{valorAvance:C}</b> para su <b>firma y validación de la entrega de los recursos</b>.</p>
                      <p>Adjunto encontrará el comprobante en PDF. Por favor revíselo, fírmelo y confirme la recepción de los recursos.</p>
                      <p style="font-size:12px;color:#6b7280">Sistema de Gestión de Caja Menor — MiraxionTech</p>
                    </div>
                    """
            };
            bodyBuilder.Attachments.Add($"Avance_{codigoAvance}.pdf", pdfAdjunto, new ContentType("application", "pdf"));
            message.Body = bodyBuilder.ToMessageBody();

            using var client = new SmtpClient();
            await client.ConnectAsync(smtpHost, smtpPort, MailKit.Security.SecureSocketOptions.StartTls);
            await client.AuthenticateAsync(smtpUser, smtpPass);
            await client.SendAsync(message);
            await client.DisconnectAsync(true);

            logger.LogInformation("Avance {Codigo} enviado a {Destinatario} vía {Host}", codigoAvance, destinatario, smtpHost);
            return Result.Ok();
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error al enviar avance {Codigo} a {Destinatario}", codigoAvance, destinatario);
            return Result.Fail($"Error al enviar correo: {ex.Message}");
        }
    }

    public async Task<Result> EnviarRecuperacionAsync(string destinatario, string nombre, string enlace)
    {
        var smtpHost = config["Email:SmtpHost"] ?? "smtp-mail.outlook.com";
        var smtpPort = int.Parse(config["Email:SmtpPort"] ?? "587");
        var smtpUser = config["Email:Usuario"] ?? "";
        var smtpPass = config["Email:Password"] ?? "";
        // El remitente debe coincidir con la cuenta autenticada (lo exigen Outlook, Gmail, etc.)
        var remitente = config["Email:Remitente"];
        if (string.IsNullOrWhiteSpace(remitente)) remitente = smtpUser;

        if (string.IsNullOrWhiteSpace(smtpUser) || string.IsNullOrWhiteSpace(smtpPass))
        {
            logger.LogWarning("SMTP sin credenciales (Email:Usuario/Email:Password vacíos). No se envió el correo a {Destinatario}.", destinatario);
            return Result.Fail("Correo no configurado: falta la cuenta remitente (Email:Usuario/Password).");
        }

        try
        {

            var message = new MimeMessage();
            message.From.Add(new MailboxAddress("Sistema Caja Menor", remitente));
            message.To.Add(new MailboxAddress(nombre, destinatario));
            message.Subject = "Recuperación de contraseña — Caja Menor";

            var bodyBuilder = new BodyBuilder
            {
                TextBody = $"Hola {nombre},\n\nRecibimos una solicitud para restablecer tu contraseña.\n" +
                           $"Abre el siguiente enlace para crear una nueva contraseña (válido por tiempo limitado):\n\n{enlace}\n\n" +
                           "Si no solicitaste este cambio, ignora este mensaje.",
                HtmlBody = $"""
                    <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;color:#1f2937">
                      <h2 style="color:#0f766e">Recuperación de contraseña</h2>
                      <p>Hola <b>{nombre}</b>,</p>
                      <p>Recibimos una solicitud para restablecer tu contraseña de <b>Caja Menor</b>.</p>
                      <p style="text-align:center;margin:28px 0">
                        <a href="{enlace}" style="background:#0f766e;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block">
                          Restablecer contraseña
                        </a>
                      </p>
                      <p style="font-size:12px;color:#6b7280">Si el botón no funciona, copia y pega este enlace en tu navegador:<br>{enlace}</p>
                      <p style="font-size:12px;color:#6b7280">Si no solicitaste este cambio, ignora este mensaje.</p>
                    </div>
                    """
            };
            message.Body = bodyBuilder.ToMessageBody();

            using var client = new SmtpClient();
            await client.ConnectAsync(smtpHost, smtpPort, MailKit.Security.SecureSocketOptions.StartTls);
            await client.AuthenticateAsync(smtpUser, smtpPass);
            await client.SendAsync(message);
            await client.DisconnectAsync(true);

            logger.LogInformation("Correo de recuperación enviado a {Destinatario} vía {Host}", destinatario, smtpHost);
            return Result.Ok();
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error al enviar correo de recuperación a {Destinatario} vía {Host}:{Port}", destinatario, smtpHost, smtpPort);
            return Result.Fail($"Error al enviar correo: {ex.Message}");
        }
    }
}
