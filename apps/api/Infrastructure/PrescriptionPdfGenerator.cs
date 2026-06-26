using HealthHub.Api.Entities;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace HealthHub.Api.Infrastructure;

// Genera el PDF imprimible de una receta médica con todos los elementos legales requeridos.
//
// ALCANCE: recetas de medicamentos de prescripción ordinaria únicamente.
// FUERA DE ALCANCE: medicamentos controlados (grupos I-IV COFEPRIS/SSA). Esos requieren
//   Receta Especial con folio oficial en formatos SSA-05 / SSA-06 y validación en SIFAR.
//
// Elementos legales incluidos (NOM-004-SSA3-2012 expediente clínico + lineamientos SSA):
//   - Nombre completo y cédula profesional del prescriptor
//   - Fecha de emisión
//   - Nombre completo e identificador del paciente
//   - Medicamento, dosis, vía de administración, frecuencia, duración
//   - Indicaciones adicionales
//   - Espacio para firma y sello del médico
public static class PrescriptionPdfGenerator
{
    static PrescriptionPdfGenerator()
    {
        // Licencia Community: gratuita para proyectos con ingresos anuales < 1 000 000 USD.
        // Si el proyecto supera ese umbral, adquirir licencia Professional o Enterprise.
        QuestPDF.Settings.License = LicenseType.Community;
    }

    public static byte[] Generate(Prescription p)
    {
        var issuedDate = p.IssuedAt.ToOffset(TimeSpan.FromHours(-6)) // UTC-6 Ciudad de México
            .ToString("dd 'de' MMMM 'de' yyyy", new System.Globalization.CultureInfo("es-MX"));

        return Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.Letter);
                page.Margin(2, Unit.Centimetre);
                page.DefaultTextStyle(ts => ts.FontSize(10).FontFamily(Fonts.Arial));

                // ── Encabezado ────────────────────────────────────────────────────────
                page.Header().Column(col =>
                {
                    col.Item().Text("RECETA MÉDICA")
                        .Bold().FontSize(16).AlignCenter();

                    col.Item().PaddingTop(4).Row(row =>
                    {
                        row.RelativeItem().Column(inner =>
                        {
                            inner.Item().Text(text =>
                            {
                                text.Span("Médico: ").Bold();
                                text.Span(p.PrescriberName);
                            });
                            inner.Item().Text(text =>
                            {
                                text.Span("Cédula profesional: ").Bold();
                                text.Span(p.PrescriberLicense);
                            });
                        });
                        row.RelativeItem().Column(inner =>
                        {
                            inner.Item().AlignRight().Text(text =>
                            {
                                text.Span("Fecha: ").Bold();
                                text.Span(issuedDate);
                            });
                            if (p.ExpiresAt.HasValue)
                            {
                                inner.Item().AlignRight().Text(text =>
                                {
                                    text.Span("Vigencia hasta: ").Bold();
                                    text.Span(p.ExpiresAt.Value.ToString("dd/MM/yyyy"));
                                });
                            }
                        });
                    });

                    col.Item().PaddingTop(6).LineHorizontal(0.5f);
                });

                // ── Contenido ─────────────────────────────────────────────────────────
                page.Content().PaddingTop(8).Column(col =>
                {
                    // Bloque paciente
                    col.Item().Background("#f5f5f5").Padding(8).Column(inner =>
                    {
                        inner.Item().Text("DATOS DEL PACIENTE").Bold().FontSize(9).FontColor("#555555");
                        inner.Item().PaddingTop(3).Text(text =>
                        {
                            text.Span("Nombre: ").Bold();
                            text.Span(p.PatientFullName);
                        });
                        if (!string.IsNullOrWhiteSpace(p.PatientIdentifier))
                        {
                            inner.Item().Text(text =>
                            {
                                text.Span("Identificador (CURP/Fecha nac.): ").Bold();
                                text.Span(p.PatientIdentifier);
                            });
                        }
                    });

                    col.Item().PaddingTop(12).Text("PRESCRIPCIÓN").Bold().FontSize(11);
                    col.Item().PaddingTop(2).LineHorizontal(0.5f);

                    // Medicamento
                    col.Item().PaddingTop(8).Table(table =>
                    {
                        table.ColumnsDefinition(cols =>
                        {
                            cols.RelativeColumn(2);
                            cols.RelativeColumn(3);
                        });

                        void Row(string label, string value)
                        {
                            table.Cell().PaddingVertical(3).Text(label).Bold();
                            table.Cell().PaddingVertical(3).Text(value);
                        }

                        Row("Medicamento:", p.MedicationName);
                        Row("Dosis:", p.Dosage);
                        Row("Vía de administración:", p.Route);
                        Row("Frecuencia:", p.Frequency);
                        Row("Duración del tratamiento:", p.Duration);
                        if (p.Refills > 0)
                            Row("Resurtidos:", p.Refills.ToString());
                    });

                    if (!string.IsNullOrWhiteSpace(p.Instructions))
                    {
                        col.Item().PaddingTop(10).Text("Indicaciones adicionales:").Bold();
                        col.Item().PaddingTop(4).Text(p.Instructions);
                    }

                    // Nota de sustancias controladas
                    col.Item().PaddingTop(16).Background("#fff3cd").Padding(6).Text(text =>
                    {
                        text.Span("Nota: ").Bold();
                        text.Span("Esta receta aplica únicamente a medicamentos de prescripción ordinaria. "
                            + "Los medicamentos controlados (grupos I-IV COFEPRIS) requieren Receta Especial "
                            + "con folio oficial de la SSA y están fuera del alcance de este documento.");
                    });
                });

                // ── Pie de página ─────────────────────────────────────────────────────
                page.Footer().PaddingTop(16).Column(footer =>
                {
                    footer.Item().LineHorizontal(0.5f);
                    footer.Item().PaddingTop(8).Row(row =>
                    {
                        row.RelativeItem().Column(sig =>
                        {
                            sig.Item().Text("______________________________").AlignCenter();
                            sig.Item().Text("Firma y sello del médico").AlignCenter().FontSize(8).FontColor("#777777");
                            sig.Item().PaddingTop(2).Text(p.PrescriberName).AlignCenter().Italic();
                            sig.Item().Text($"Cédula: {p.PrescriberLicense}").AlignCenter().FontSize(8).FontColor("#555555");
                        });
                        row.RelativeItem().Column(gen =>
                        {
                            gen.Item().Text($"Receta ID: {p.Id[..8]}").AlignRight().FontSize(7).FontColor("#aaaaaa");
                            gen.Item().Text("Generado por Clinixa.mx").AlignRight().FontSize(7).FontColor("#aaaaaa");
                        });
                    });
                });
            });
        }).GeneratePdf();
    }
}
