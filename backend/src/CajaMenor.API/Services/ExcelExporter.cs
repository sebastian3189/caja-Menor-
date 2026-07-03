using ClosedXML.Excel;
using CajaMenor.Application.DTOs;

namespace CajaMenor.API.Services;

/// <summary>Genera libros de Excel (.xlsx) para exportar listados a reportes internos.</summary>
public static class ExcelExporter
{
    private static readonly XLColor HeaderBg = XLColor.FromHtml("#0d9488");
    private static readonly XLColor HeaderText = XLColor.White;

    public static byte[] Avances(IEnumerable<AvanceDto> avances, string nombreCaja)
    {
        using var wb = new XLWorkbook();
        var ws = wb.Worksheets.Add("Avances");

        var headers = new[] { "Código", "Fecha envío", "Solicitante", "Descripción", "Valor", "Estado", "Tipo", "Reembolso" };
        EscribirEncabezado(ws, headers, nombreCaja, "Reporte de Avances");

        var row = 4;
        foreach (var a in avances)
        {
            ws.Cell(row, 1).Value = a.CodigoAvance;
            ws.Cell(row, 2).Value = a.FechaEnvio;
            ws.Cell(row, 2).Style.DateFormat.Format = "yyyy-mm-dd";
            ws.Cell(row, 3).Value = a.Solicitante;
            ws.Cell(row, 4).Value = a.Descripcion;
            ws.Cell(row, 5).Value = a.ValorAvance;
            ws.Cell(row, 5).Style.NumberFormat.Format = "$#,##0";
            ws.Cell(row, 6).Value = a.Estado;
            ws.Cell(row, 7).Value = a.TipoAvance ?? "—";
            ws.Cell(row, 8).Value = a.EstadoReembolso;
            row++;
        }

        // Fila de total
        ws.Cell(row, 4).Value = "TOTAL";
        ws.Cell(row, 4).Style.Font.Bold = true;
        ws.Cell(row, 5).FormulaA1 = $"SUM(E4:E{row - 1})";
        ws.Cell(row, 5).Style.NumberFormat.Format = "$#,##0";
        ws.Cell(row, 5).Style.Font.Bold = true;

        Finalizar(ws, headers.Length);
        return Guardar(wb);
    }

    public static byte[] Legalizaciones(IEnumerable<LegalizacionDto> legalizaciones, string nombreCaja)
    {
        using var wb = new XLWorkbook();
        var ws = wb.Worksheets.Add("Legalizaciones");

        var headers = new[] { "Código", "Fecha", "Avance", "V. Avance", "Monto", "Diferencia", "Desc. Caja", "A Reembolsar", "Tipo", "Estado", "Recibos" };
        EscribirEncabezado(ws, headers, nombreCaja, "Reporte de Legalizaciones");

        var row = 4;
        foreach (var l in legalizaciones)
        {
            ws.Cell(row, 1).Value = l.CodigoLegalizacion;
            ws.Cell(row, 2).Value = l.FechaLegalizacion;
            ws.Cell(row, 2).Style.DateFormat.Format = "yyyy-mm-dd";
            ws.Cell(row, 3).Value = l.CodigoAvance ?? "Sin avance";
            ws.Cell(row, 4).Value = l.ValorAvance;
            ws.Cell(row, 4).Style.NumberFormat.Format = "$#,##0";
            ws.Cell(row, 5).Value = l.Monto;
            ws.Cell(row, 5).Style.NumberFormat.Format = "$#,##0";
            ws.Cell(row, 6).Value = l.Diferencia;
            ws.Cell(row, 6).Style.NumberFormat.Format = "$#,##0";
            ws.Cell(row, 7).Value = l.DescuentoCaja;
            ws.Cell(row, 7).Style.NumberFormat.Format = "$#,##0";
            ws.Cell(row, 8).Value = l.ValorReembolsar;
            ws.Cell(row, 8).Style.NumberFormat.Format = "$#,##0";
            ws.Cell(row, 9).Value = l.TipoLegalizacion;
            ws.Cell(row, 10).Value = l.EstadoReembolso;
            ws.Cell(row, 11).Value = l.Recibos.Count;
            row++;
        }

        ws.Cell(row, 4).Value = "TOTAL";
        ws.Cell(row, 4).Style.Font.Bold = true;
        ws.Cell(row, 5).FormulaA1 = $"SUM(E4:E{row - 1})";
        ws.Cell(row, 5).Style.NumberFormat.Format = "$#,##0";
        ws.Cell(row, 5).Style.Font.Bold = true;

        Finalizar(ws, headers.Length);
        return Guardar(wb);
    }

    // ── Helpers ──
    private static void EscribirEncabezado(IXLWorksheet ws, string[] headers, string nombreCaja, string titulo)
    {
        ws.Cell(1, 1).Value = titulo;
        ws.Cell(1, 1).Style.Font.Bold = true;
        ws.Cell(1, 1).Style.Font.FontSize = 14;
        ws.Cell(2, 1).Value = $"Caja: {nombreCaja}  ·  Generado: {DateTime.Now:yyyy-MM-dd HH:mm}";
        ws.Cell(2, 1).Style.Font.FontColor = XLColor.Gray;

        for (var c = 0; c < headers.Length; c++)
        {
            var cell = ws.Cell(3, c + 1);
            cell.Value = headers[c];
            cell.Style.Fill.BackgroundColor = HeaderBg;
            cell.Style.Font.FontColor = HeaderText;
            cell.Style.Font.Bold = true;
            cell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
        }
    }

    private static void Finalizar(IXLWorksheet ws, int cols)
    {
        ws.Columns(1, cols).AdjustToContents();
        ws.SheetView.FreezeRows(3);
        ws.Range(3, 1, 3, cols).SetAutoFilter();
    }

    private static byte[] Guardar(XLWorkbook wb)
    {
        using var ms = new MemoryStream();
        wb.SaveAs(ms);
        return ms.ToArray();
    }
}
