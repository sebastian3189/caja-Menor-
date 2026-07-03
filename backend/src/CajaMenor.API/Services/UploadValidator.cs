namespace CajaMenor.API.Services;

/// <summary>Validaciones de seguridad para archivos subidos (S-03, S-10, S-11).</summary>
public static class UploadValidator
{
    public const long MaxBytes = 10_485_760; // 10 MB

    private static readonly string[] ExtensionesPermitidas =
        [".jpg", ".jpeg", ".png", ".gif", ".webp", ".pdf"];

    private static readonly string[] ContentTypesPermitidos =
        ["image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf"];

    /// <summary>
    /// Valida extensión, content-type y tamaño. Devuelve null si es válido,
    /// o un mensaje de error listo para BadRequest.
    /// </summary>
    public static string? Validar(IFormFile archivo)
    {
        if (archivo is null || archivo.Length == 0)
            return "Debe adjuntar un archivo.";

        // S-11: usar solo el nombre base para derivar la extensión (evita path traversal)
        var nombreSeguro = Path.GetFileName(archivo.FileName);
        var ext = Path.GetExtension(nombreSeguro).ToLowerInvariant();

        if (!ExtensionesPermitidas.Contains(ext))
            return $"Formato no permitido: '{nombreSeguro}'. Use JPG, PNG, GIF, WEBP o PDF.";

        // S-10: validar el content-type declarado además de la extensión
        if (!ContentTypesPermitidos.Contains(archivo.ContentType))
            return $"Tipo de contenido no permitido para '{nombreSeguro}'.";

        if (archivo.Length > MaxBytes)
            return $"El archivo '{nombreSeguro}' supera el máximo de 10 MB.";

        return null;
    }

    /// <summary>Extensión en minúsculas derivada del nombre base seguro.</summary>
    public static string ExtensionSegura(IFormFile archivo)
        => Path.GetExtension(Path.GetFileName(archivo.FileName)).ToLowerInvariant();
}
