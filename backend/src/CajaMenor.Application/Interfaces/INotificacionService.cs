using CajaMenor.Application.Common;

namespace CajaMenor.Application.Interfaces;

public interface INotificacionService
{
    Task<Result> EnviarArqueoTesoreriaAsync(string destinatario, string nombreCaja, string director, string administrador, byte[] pdfAdjunto);
}
