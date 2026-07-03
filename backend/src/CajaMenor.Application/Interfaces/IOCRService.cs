namespace CajaMenor.Application.Interfaces;

public record OCRResult(bool Exitoso, decimal? MontoExtraido, string TextoCompleto, string? Error);

public interface IOCRService
{
    Task<OCRResult> ExtraerMontoFacturaAsync(Stream fileStream, string extension);
}
