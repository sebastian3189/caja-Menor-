# SPEC-01 — Mejoras de Funcionalidad (Post-Análisis)

> **Proyecto:** Sistema de Caja Menor  
> **Versión:** 1.1  
> **Fecha:** 2026-07-02  
> **Estado:** Pendiente de implementación

---

## 1. Resumen ejecutivo

Este documento describe las mejoras de funcionalidad identificadas tras el análisis completo del sistema. Incluye dos requisitos críticos de negocio:

1. **Control de tope de caja**: ningún avance ni legalización puede superar el monto asignado a la caja.
2. **Validación OCR de facturas**: antes de aceptar una imagen de factura, el sistema extrae el valor neto/total mediante OCR y lo compara contra el monto registrado en la legalización. Si no coincide, el upload es rechazado.

---

## 2. F-01 — Control de tope de caja (CRÍTICO)

### 2.1 Problema actual

El servicio `AvanceService.CrearAsync` valida que `caja.Disponible >= dto.ValorAvance`, lo que impide gastar más de lo disponible. Sin embargo:

- Al **editar** un avance ya legalizado se puede alterar el valor sin restricción de tope.
- Las **legalizaciones sin avance** (pago directo) reducen el disponible pero no validan el tope de apertura (`ValorApertura`).
- No existe un control global que impida que la sumatoria de avances pendientes + legalizaciones supere el `ValorApertura`.

### 2.2 Regla de negocio

> **Regla:** En ningún momento la suma de `TotalUsado + nuevoValor` puede superar `ValorApertura` de la caja.

```
CONDICIÓN DE BLOQUEO:
   (caja.TotalUsado + valorNuevo) > caja.ValorApertura
   ↳ Rechazar con HTTP 400 + mensaje descriptivo
```

### 2.3 Cambios en el backend

#### A. `AvanceService.CrearAsync`
Agregar validación adicional al crear avance:

```csharp
// Además de validar caja.Disponible >= dto.ValorAvance
if (caja.TotalUsado + dto.ValorAvance > caja.ValorApertura)
    return Result<AvanceDto>.Fail(
        $"El avance supera el tope de caja. Tope: {caja.ValorApertura:C}, Usado: {caja.TotalUsado:C}");
```

#### B. `AvanceService.EditarAsync`
Al editar el valor de un avance pendiente, verificar que el delta no supere el tope:

```csharp
var nuevoTotal = caja.TotalUsado + delta;
if (nuevoTotal > caja.ValorApertura)
    return Result<AvanceDto>.Fail(
        $"El nuevo valor supera el tope de caja. Tope: {caja.ValorApertura:C}, Disponible ajustado: {caja.Disponible - delta:C}");
```

#### C. `LegalizacionService.CrearAsync`
Las legalizaciones sin avance también consumen el disponible. Agregar validación:

```csharp
if (dto.AvanceId == null)
{
    // Legalización directa: descuenta del disponible
    if (caja.TotalUsado + dto.Monto > caja.ValorApertura)
        return Result<LegalizacionDto>.Fail(
            $"La legalización supera el tope de caja. Tope: {caja.ValorApertura:C}, Usado: {caja.TotalUsado:C}");
    caja.Disponible -= dto.Monto;
    caja.TotalUsado += dto.Monto;
}
```

#### D. `LegalizacionService.EditarAsync`
Al cambiar el monto de una legalización directa (sin avance), revalidar el tope con el delta.

### 2.4 Cambios en el frontend

- En los formularios de avance y legalización, mostrar siempre el **saldo disponible actual** de la caja.
- Cuando el error del backend sea de tope excedido, mostrar un toast/alerta con el mensaje completo (no un genérico "Error al crear").
- Añadir validación client-side que bloquee el submit si `valorIngresado > disponible` (evitar round-trip innecesario).

---

## 3. F-02 — Validación OCR de facturas (CRÍTICO)

### 3.1 Flujo actual

El endpoint `POST /api/cajas/{cajaId}/legalizaciones/{id}/recibos` acepta cualquier imagen o PDF válido y lo almacena en disco sin verificar su contenido contra el monto registrado en la legalización.

### 3.2 Flujo propuesto

```
Usuario sube imagen/PDF de factura
        │
        ▼
Backend guarda archivo temporalmente
        │
        ▼
Se invoca servicio OCR → extrae texto
        │
        ▼
Se parsea el valor monetario extraído
(buscar patrones: TOTAL, NETO, VALOR TOTAL, NET VALUE)
        │
        ▼
¿Valor OCR ≈ Legalizacion.Monto?  (tolerancia ±2%)
       / \
     SÍ   NO
      │     │
      ▼     ▼
  Archivo  Rechazar upload
  se       Eliminar temp file
  persiste Devolver HTTP 422
  OK       con detalle:
           "Valor factura ({ocr}) ≠ monto legalizado ({monto})"
```

### 3.3 Tecnología OCR recomendada

**Opción A (Recomendada): Azure Document Intelligence (Form Recognizer)**
- Endpoint: `prebuilt-invoice` → extrae campos estructurados: `InvoiceTotal`, `SubTotal`, `TotalTax`
- Alta precisión en facturas colombianas
- Costo: ~$1.50 / 1000 páginas (capa gratuita: 500 pág/mes)
- Paquete NuGet: `Azure.AI.FormRecognizer`

**Opción B: Google Cloud Vision API**
- OCR de texto genérico + regex para extraer monto
- Paquete NuGet: `Google.Cloud.Vision.V1`

**Opción C: Tesseract (sin costo)**
- OCR local, sin dependencia cloud
- Menor precisión en facturas manuscritas o fotos de baja calidad
- Paquete NuGet: `Tesseract`

### 3.4 Nueva entidad/campo en dominio

Agregar campos al modelo `LegalizacionRecibo`:

```csharp
public class LegalizacionRecibo
{
    // ... campos existentes ...
    public decimal? ValorOCR { get; set; }        // valor extraído por OCR
    public bool ValidadoOCR { get; set; } = false; // si pasó la validación
    public string? NotaOCR { get; set; }           // texto extraído para auditoría
}
```

Nueva migración: `AddOCRFieldsToLegalizacionRecibo`

### 3.5 Nueva interfaz de servicio

```csharp
// Application/Interfaces/IOCRService.cs
public interface IOCRService
{
    Task<OCRResult> ExtraerMontoFacturaAsync(Stream fileStream, string extension);
}

public record OCRResult(bool Exitoso, decimal? MontoExtraido, string TextoCompleto, string? Error);
```

### 3.6 Implementación del servicio (Azure Form Recognizer)

```csharp
// Infrastructure/Services/AzureOCRService.cs
public class AzureOCRService(IConfiguration config) : IOCRService
{
    public async Task<OCRResult> ExtraerMontoFacturaAsync(Stream fileStream, string extension)
    {
        var client = new DocumentAnalysisClient(
            new Uri(config["Azure:FormRecognizer:Endpoint"]),
            new AzureKeyCredential(config["Azure:FormRecognizer:Key"]));

        var operation = await client.AnalyzeDocumentAsync(
            WaitUntil.Completed, "prebuilt-invoice", fileStream);

        var result = operation.Value;
        if (!result.Documents.Any()) return new OCRResult(false, null, "", "No se detectó documento");

        var invoice = result.Documents[0];
        if (invoice.Fields.TryGetValue("InvoiceTotal", out var totalField))
        {
            var monto = (decimal?)totalField.Value?.AsDouble();
            return new OCRResult(true, monto, totalField.Content ?? "", null);
        }

        return new OCRResult(false, null, result.Content, "No se encontró campo de total");
    }
}
```

### 3.7 Modificación del endpoint de subida

```csharp
// LegalizacionesController.cs — SubirRecibo
[HttpPost("{id}/recibos")]
[Authorize(Roles = "Administrador")]
public async Task<IActionResult> SubirRecibo(int cajaId, int id, IFormFile archivo)
{
    // 1. Validaciones existentes (formato, tamaño)
    // 2. Guardar en path temporal
    // 3. Llamar OCR
    var ocrResult = await ocrService.ExtraerMontoFacturaAsync(stream, ext);

    if (ocrResult.Exitoso && ocrResult.MontoExtraido.HasValue)
    {
        var legalizacion = await legalizacionService.ObtenerPorIdAsync(id);
        var diferencia = Math.Abs(ocrResult.MontoExtraido.Value - legalizacion.Data!.Monto);
        var tolerancia = legalizacion.Data.Monto * 0.02m; // 2% tolerancia

        if (diferencia > tolerancia)
        {
            System.IO.File.Delete(tempPath);
            return UnprocessableEntity(new {
                message = $"El valor de la factura ({ocrResult.MontoExtraido:C}) no coincide con el monto legalizado ({legalizacion.Data.Monto:C}). Diferencia: {diferencia:C}",
                valorOCR = ocrResult.MontoExtraido,
                montoLegalizado = legalizacion.Data.Monto
            });
        }
    }

    // 4. Si OCR no detecta valor (ej. PDF ilegible), continuar con advertencia
    var result = await service.SubirReciboAsync(id, archivo.FileName, finalPath,
        ocrResult.MontoExtraido, ocrResult.TextoCompleto);

    return Ok(result.Data);
}
```

### 3.8 Configuración

Agregar a `appsettings.json`:

```json
"Azure": {
  "FormRecognizer": {
    "Endpoint": "https://{resource}.cognitiveservices.azure.com/",
    "Key": "YOUR_KEY"
  }
},
"OCR": {
  "ToleranciaPorc": 2,
  "HabilitarValidacion": true,
  "RechazarSiNoDetecta": false
}
```

`RechazarSiNoDetecta: false` → si el OCR no logra extraer un valor (PDF mal escaneado), permite el upload con un estado de advertencia en lugar de bloquear el flujo.

### 3.9 Cambios en el frontend

- Al subir un recibo, mostrar spinner con mensaje "Analizando factura...".
- Si el OCR rechaza el archivo, mostrar modal de error con:
  - Valor detectado en la imagen
  - Valor registrado en la legalización
  - Diferencia
  - Instrucción: "Verifique que el monto de la factura coincida con el monto legalizado"
- Si el OCR no pudo detectar el valor, mostrar advertencia amarilla: "No se pudo verificar el monto automáticamente. Verifique manualmente."

---

## 4. F-03 — Mejoras menores de funcionalidad

### 4.1 Edición y eliminación de avances

**Problema:** No existe endpoint ni botón para eliminar un avance pendiente que fue creado por error.

**Propuesta:**
- Agregar `DELETE /api/cajas/{cajaId}/avances/{id}` (solo si `Estado == Pendiente`).
- Al eliminar: `caja.Disponible += avance.ValorAvance`, `caja.TotalUsado -= avance.ValorAvance`.
- Botón "Eliminar" en la tabla de avances (solo para Administrador y solo si está Pendiente).

### 4.2 Indicador de disponible en tiempo real

**Problema:** El usuario no ve cuánto disponible queda mientras escribe el monto del avance.

**Propuesta:**
- En el modal de nuevo avance/legalización, mostrar banner inferior: `Disponible en caja: $X.XXX.XXX`
- Mientras el usuario tipea el monto, actualizar en tiempo real: `Después del avance quedaría: $Y.YYY.YYY`
- Colorear en rojo si el valor ingresado supera el disponible.

### 4.3 Filtros y búsqueda en tablas

**Problema:** Las tablas no tienen búsqueda ni filtros; con muchos registros se vuelven inutilizables.

**Propuesta:**
- Añadir barra de búsqueda por código y descripción.
- Filtro por estado (para avances: Pendiente / Legalizado; para legalizaciones: SinReembolso / EnProceso / Reembolsado).
- Filtro por rango de fechas.
- Paginación del lado del cliente (10 / 25 / 50 por página).

### 4.4 Exportación a Excel/PDF de listados

**Problema:** No hay forma de exportar los datos para reportes internos.

**Propuesta:**
- Botón "Exportar Excel" en las páginas de Avances, Legalizaciones y Reembolsos.
- En el backend: endpoint `GET /api/cajas/{cajaId}/avances/exportar` → genera `.xlsx` usando `ClosedXML` o `EPPlus`.
- Para PDF de listados usar `QuestPDF`.

### 4.5 Validación de código automático

**Problema:** El usuario tiene que escribir manualmente `REQ-0001`, `LEG-0001`, etc. Puede haber errores y duplicados.

**Propuesta:**
- Al abrir el modal de nuevo avance/legalización, el campo "Código" se pre-rellena automáticamente con el siguiente número consecutivo.
- Endpoint: `GET /api/cajas/{cajaId}/avances/siguiente-codigo` → devuelve `{ codigo: "REQ-0042" }`.
- El campo sigue siendo editable.

### 4.6 Historial de auditoría visible en UI

**Problema:** La entidad `AuditLog` existe en base de datos pero no se consume en ninguna pantalla.

**Propuesta:**
- Nueva página "Auditoría" (solo Director).
- Muestra tabla con: fecha, usuario, acción, tabla afectada, valores anteriores y nuevos.
- Los services deben escribir en `AuditLog` en todas las operaciones de escritura (Create, Update, Delete).

### 4.7 Notificaciones de estado

**Problema:** No hay sistema de notificaciones; el administrador no sabe cuándo el director confirma reembolsos.

**Propuesta (corto plazo):** Badges con contadores en el menú lateral.
- "Reembolsos" → mostrar contador de `EnProceso` pendientes de confirmar.
- "Legalizaciones" → contador de `SinReembolso`.

**Propuesta (largo plazo):** Notificaciones push via `SignalR` WebSocket.

---

## 5. Priorización

| ID | Mejora | Prioridad | Complejidad |
|----|--------|-----------|-------------|
| F-01 | Control de tope de caja | **Crítica** | Baja |
| F-02 | Validación OCR de facturas | **Crítica** | Alta |
| F-03-a | Eliminar avance pendiente | Alta | Baja |
| F-03-b | Indicador disponible en tiempo real | Alta | Baja |
| F-03-c | Filtros y búsqueda | Media | Media |
| F-03-d | Exportación Excel/PDF | Media | Media |
| F-03-e | Código automático | Media | Baja |
| F-03-f | Historial de auditoría en UI | Baja | Media |
| F-03-g | Notificaciones | Baja | Alta |

---

## 6. Impacto en base de datos

| Cambio | Tabla | Tipo |
|--------|-------|------|
| Campos OCR | `LegalizacionRecibos` | Columnas nuevas: `ValorOCR`, `ValidadoOCR`, `NotaOCR` |
| AuditLog writing | `AuditLogs` | Sin cambio de esquema, solo uso real |

Nueva migración requerida: `AddOCRFieldsToLegalizacionRecibo`
