using CajaMenor.Application.Common;
using CajaMenor.Application.DTOs;

namespace CajaMenor.Application.Interfaces;

public interface IArqueoService
{
    Task<Result<ArqueoDto>> ObtenerArqueoActivoAsync(int cajaId);
    Task<Result<ArqueoDto>> GenerarArqueoAsync(int cajaId);
    Task<Result> SubirFirmaDirectivoAsync(int cajaId, string rutaFirma);
    Task<Result> SubirFirmaAdministradorAsync(int cajaId, string rutaFirma);
    Task<Result> EliminarFirmaDirectivoAsync(int cajaId);
    Task<Result> EliminarFirmaAdministradorAsync(int cajaId);
    Task<Result> EnviarATesoreriaAsync(int cajaId);
    Task<Result<byte[]>> GenerarPdfArqueoAsync(int cajaId);
    /// <summary>Procesa la respuesta de Tesorería (aceptar/denegar) desde el enlace del correo. Devuelve un mensaje para mostrar en la página HTML.</summary>
    Task<Result<string>> ResponderTesoreriaAsync(string token, bool aceptar);
}
