using CajaMenor.Application.Common;

namespace CajaMenor.Application.Interfaces;

public interface INotificacionService
{
    Task<Result> EnviarArqueoTesoreriaAsync(string destinatario, string nombreCaja, string director, string administrador, byte[] pdfAdjunto, string urlAceptar, string urlDenegar);

    /// <summary>Envía el correo de recuperación de contraseña con el enlace de restablecimiento.</summary>
    Task<Result> EnviarRecuperacionAsync(string destinatario, string nombre, string enlace);

    /// <summary>Envía al solicitante el documento (PDF) del avance para su firma y validación de la entrega de recursos.</summary>
    Task<Result> EnviarAvanceSolicitanteAsync(string destinatario, string nombre, string codigoAvance, decimal valorAvance, byte[] pdfAdjunto);
}
