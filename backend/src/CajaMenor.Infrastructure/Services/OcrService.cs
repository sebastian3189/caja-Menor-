using CajaMenor.Application.Interfaces;
using Microsoft.Extensions.Configuration;
using System.Text.RegularExpressions;
using Tesseract;

namespace CajaMenor.Infrastructure.Services;

public class OcrService(IConfiguration config) : IOCRService
{
    private static readonly string[] ImageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".tiff", ".tif"];

    // Patrones para buscar el total en texto de factura
    private static readonly Regex _totalRegex = new(
        @"(?:TOTAL\s*A?\s*PAGAR|TOTAL\s*FACTURA|VALOR\s*TOTAL|TOTAL\s*NETO|NETO\s*A\s*PAGAR|NET\s*TOTAL|GRAND\s*TOTAL|SUBTOTAL|TOTAL)[:\s]*[$\s]*([\d]{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})?)",
        RegexOptions.IgnoreCase | RegexOptions.Multiline);

    private static readonly Regex _montoGenericoRegex = new(
        @"(?<!\w)\$?\s*([\d]{1,3}(?:[.,]\d{3})+(?:[.,]\d{1,2})?)",
        RegexOptions.Multiline);

    public async Task<OCRResult> ExtraerMontoFacturaAsync(Stream fileStream, string extension)
    {
        var endpoint = config["Azure:FormRecognizer:Endpoint"];
        var key = config["Azure:FormRecognizer:Key"];

        // 1. Intentar Azure si hay credenciales
        if (!string.IsNullOrWhiteSpace(endpoint) && !string.IsNullOrWhiteSpace(key))
            return await ExtraerConAzureAsync(fileStream, extension, endpoint, key);

        // 2. Imagen → usar Tesseract local
        if (ImageExtensions.Contains(extension.ToLowerInvariant()))
            return await ExtraerConTesseractAsync(fileStream);

        // 3. PDF con texto seleccionable → regex local
        if (extension.Equals(".pdf", StringComparison.OrdinalIgnoreCase))
        {
            var resultado = await ExtraerTextoPdfAsync(fileStream);
            if (resultado is not null)
                return new OCRResult(true, resultado, $"Extraído de PDF: {resultado}", null);
        }

        return new OCRResult(false, null, string.Empty, "No se pudo analizar el archivo.");
    }

    // ──────────────────────────────────────────
    // Tesseract (local, imágenes)
    // ──────────────────────────────────────────
    private async Task<OCRResult> ExtraerConTesseractAsync(Stream fileStream)
    {
        try
        {
            var tessdataPath = ObtenerRutaTessdata();
            if (tessdataPath is null)
                return new OCRResult(false, null, string.Empty,
                    "Tessdata no encontrado. Coloque los archivos eng.traineddata y spa.traineddata en la carpeta tessdata/ del API.");

            using var ms = new MemoryStream();
            await fileStream.CopyToAsync(ms);
            var bytes = ms.ToArray();

            // Intentar con español primero (facturas colombianas), luego inglés
            foreach (var lang in new[] { "spa+eng", "eng" })
            {
                try
                {
                    using var engine = new TesseractEngine(tessdataPath, lang, EngineMode.Default);
                    using var pix = Pix.LoadFromMemory(bytes);
                    using var page = engine.Process(pix);
                    var texto = page.GetText();

                    var monto = ExtraerMayorMonto(texto);
                    if (monto.HasValue)
                        return new OCRResult(true, monto, texto, null);

                    // Si extrajo texto pero no encontró monto, devolver el texto para auditoría
                    if (!string.IsNullOrWhiteSpace(texto))
                        return new OCRResult(false, null, texto, "No se detectó monto en la imagen.");
                }
                catch (Exception ex) when (ex.Message.Contains("traineddata"))
                {
                    // Idioma no disponible, continuar con el siguiente
                }
            }

            return new OCRResult(false, null, string.Empty, "No se pudo extraer texto de la imagen.");
        }
        catch (Exception ex)
        {
            return new OCRResult(false, null, string.Empty, $"Error OCR: {ex.Message}");
        }
    }

    private static string? ObtenerRutaTessdata()
    {
        var candidatos = new[]
        {
            Path.Combine(AppContext.BaseDirectory, "tessdata"),
            Path.Combine(Directory.GetCurrentDirectory(), "tessdata"),
            Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "tessdata"),
        };

        return candidatos.FirstOrDefault(p =>
            Directory.Exists(p) && Directory.GetFiles(p, "*.traineddata").Length > 0);
    }

    // ──────────────────────────────────────────
    // PDF con texto seleccionable
    // ──────────────────────────────────────────
    private static async Task<decimal?> ExtraerTextoPdfAsync(Stream stream)
    {
        try
        {
            stream.Position = 0;
            using var reader = new StreamReader(stream, leaveOpen: true);
            var contenido = await reader.ReadToEndAsync();
            stream.Position = 0;
            return ExtraerMayorMonto(contenido);
        }
        catch { return null; }
    }

    // ──────────────────────────────────────────
    // Extracción de monto de texto plano
    // ──────────────────────────────────────────
    private static decimal? ExtraerMayorMonto(string texto)
    {
        if (string.IsNullOrWhiteSpace(texto)) return null;

        // Primero buscar campo de total explícito
        var match = _totalRegex.Match(texto);
        if (match.Success)
        {
            var valorStr = NormalizarDecimal(match.Groups[1].Value);
            if (decimal.TryParse(valorStr, System.Globalization.NumberStyles.Number,
                System.Globalization.CultureInfo.InvariantCulture, out var valor) && valor > 0)
                return valor;
        }

        // Fallback: el monto más alto en el documento (normalmente el total)
        var montos = _montoGenericoRegex.Matches(texto)
            .Select(m =>
            {
                var s = NormalizarDecimal(m.Groups[1].Value);
                return decimal.TryParse(s, System.Globalization.NumberStyles.Number,
                    System.Globalization.CultureInfo.InvariantCulture, out var v) ? (decimal?)v : null;
            })
            .Where(v => v.HasValue && v > 0)
            .Select(v => v!.Value)
            .ToList();

        return montos.Count > 0 ? montos.Max() : null;
    }

    private static string NormalizarDecimal(string valor)
    {
        // Colombia usa puntos como separador de miles y coma como decimal
        // Detectar si el último separador es coma o punto para decidir
        valor = valor.Trim();
        var ultimaComa = valor.LastIndexOf(',');
        var ultimoPunto = valor.LastIndexOf('.');

        if (ultimaComa > ultimoPunto)
        {
            // Formato colombiano: 1.234.567,89 → quitar puntos, reemplazar coma por punto
            return valor.Replace(".", "").Replace(",", ".");
        }
        else
        {
            // Formato inglés: 1,234,567.89 → quitar comas
            return valor.Replace(",", "");
        }
    }

    // ──────────────────────────────────────────
    // Azure Form Recognizer (producción)
    // ──────────────────────────────────────────
    private static async Task<OCRResult> ExtraerConAzureAsync(
        Stream fileStream, string extension, string endpoint, string key)
    {
        try
        {
            var assemblyName = "Azure.AI.FormRecognizer";
            var assembly = AppDomain.CurrentDomain.GetAssemblies()
                .FirstOrDefault(a => a.GetName().Name == assemblyName);

            if (assembly is null)
                return new OCRResult(false, null, string.Empty,
                    "Paquete Azure.AI.FormRecognizer no instalado.");

            return await InvocarAzureFormRecognizerAsync(assembly, fileStream, endpoint, key);
        }
        catch (Exception ex)
        {
            return new OCRResult(false, null, string.Empty, $"Error Azure OCR: {ex.Message}");
        }
    }

    private static async Task<OCRResult> InvocarAzureFormRecognizerAsync(
        System.Reflection.Assembly assembly, Stream fileStream, string endpoint, string key)
    {
        var clientType = assembly.GetType("Azure.AI.FormRecognizer.DocumentAnalysis.DocumentAnalysisClient");
        var credType = assembly.GetType("Azure.AzureKeyCredential");
        var waitUntilType = assembly.GetType("Azure.WaitUntil");

        if (clientType is null || credType is null || waitUntilType is null)
            return new OCRResult(false, null, string.Empty, "Tipos de Azure no encontrados.");

        var credential = Activator.CreateInstance(credType, key);
        var client = Activator.CreateInstance(clientType, new Uri(endpoint), credential);
        var completed = waitUntilType.GetField("Completed")?.GetValue(null);

        var analyzeMethod = clientType.GetMethod("AnalyzeDocumentAsync",
            [waitUntilType, typeof(string), typeof(Stream),
             assembly.GetType("Azure.AI.FormRecognizer.DocumentAnalysis.AnalyzeDocumentOptions")!,
             typeof(CancellationToken)]);

        if (analyzeMethod is null)
            return new OCRResult(false, null, string.Empty, "Método AnalyzeDocumentAsync no encontrado.");

        var task = analyzeMethod.Invoke(client,
            [completed, "prebuilt-invoice", fileStream, null, CancellationToken.None]);
        if (task is not Task t) return new OCRResult(false, null, string.Empty, "No se obtuvo Task.");
        await t;

        var documents = ((t.GetType().GetProperty("Value")?.GetValue(t))
            ?.GetType().GetProperty("Documents")?.GetValue(
                t.GetType().GetProperty("Value")?.GetValue(t))) as System.Collections.IEnumerable;

        if (documents is null) return new OCRResult(false, null, string.Empty, "Sin documentos.");

        foreach (var doc in documents)
        {
            var fields = doc.GetType().GetProperty("Fields")?.GetValue(doc) as System.Collections.IDictionary;
            if (fields is null) continue;

            foreach (var campo in new[] { "InvoiceTotal", "SubTotal", "TotalTax" })
            {
                if (!fields.Contains(campo)) continue;
                var field = fields[campo];
                var fieldValue = field?.GetType().GetProperty("Value")?.GetValue(field);
                var asDouble = fieldValue?.GetType().GetMethod("AsDouble");
                if (asDouble?.Invoke(fieldValue, null) is double d)
                    return new OCRResult(true, (decimal)d, $"Azure campo '{campo}': {d}", null);
            }
        }

        return new OCRResult(false, null, string.Empty, "No se encontró campo de total (Azure).");
    }
}
