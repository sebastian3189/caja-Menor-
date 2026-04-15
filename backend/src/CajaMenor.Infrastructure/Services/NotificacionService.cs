using CajaMenor.Application.Common;
using CajaMenor.Application.Interfaces;
using MailKit.Net.Smtp;
using MimeKit;
using Microsoft.Extensions.Configuration;

namespace CajaMenor.Infrastructure.Services;

public class NotificacionService(IConfiguration config) : INotificacionService
{
    public async Task<Result> EnviarArqueoTesoreriaAsync(string destinatario, string nombreCaja, string director, string administrador, byte[] pdfAdjunto)
    {
        try
        {
            var smtpHost = config["Email:SmtpHost"] ?? "localhost";
            var smtpPort = int.Parse(config["Email:SmtpPort"] ?? "587");
            var smtpUser = config["Email:Usuario"] ?? "";
            var smtpPass = config["Email:Password"] ?? "";
            var remitente = config["Email:Remitente"] ?? "cajamenor@empresa.com";

            var message = new MimeMessage();
            message.From.Add(new MailboxAddress("Sistema Caja Menor", remitente));
            message.To.Add(new MailboxAddress("Tesorería", destinatario));
            message.Subject = $"Arqueo Caja Menor {nombreCaja}";

            var bodyBuilder = new BodyBuilder
            {
                TextBody = $"Caja Menor: {nombreCaja}\nDirector Encargado: {director}\nAdministradora Encargada: {administrador}\n\nSe adjunta el arqueo para su revisión y aprobación del reembolso."
            };
            bodyBuilder.Attachments.Add($"Arqueo_{nombreCaja.Replace(" ", "_")}.pdf", pdfAdjunto, new ContentType("application", "pdf"));
            message.Body = bodyBuilder.ToMessageBody();

            using var client = new SmtpClient();
            await client.ConnectAsync(smtpHost, smtpPort, MailKit.Security.SecureSocketOptions.StartTls);
            if (!string.IsNullOrEmpty(smtpUser))
                await client.AuthenticateAsync(smtpUser, smtpPass);
            await client.SendAsync(message);
            await client.DisconnectAsync(true);

            return Result.Ok();
        }
        catch (Exception ex)
        {
            return Result.Fail($"Error al enviar correo: {ex.Message}");
        }
    }
}
