import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { supabaseAdmin } from "./supabase";

/**
 * Generates a final, flattened PDF by drawing text onto a template.
 *
 * NOTE: This is a simplified implementation for the MVP. It assumes a basic,
 * single-page PDF and draws text at fixed coordinates. A more advanced version
 * would parse the `extracted_data_json` to place text dynamically.
 *
 * @param templatePath - The path to the original PDF in Supabase Storage.
 * @param filledData - The key-value map of the data to stamp onto the PDF.
 * @returns A Buffer containing the bytes of the new PDF file.
 */
export async function generateFinalPdf(
  templatePath: string,
  filledData: Record<string, string>
): Promise<Buffer> {
  // 1. Download the original PDF template from storage
  const { data: fileData, error: downloadError } = await supabaseAdmin.storage
    .from("documents")
    .download(templatePath);

  if (downloadError) {
    throw new Error(
      `Failed to download template PDF: ${downloadError.message}`
    );
  }

  const templateBytes = await fileData.arrayBuffer();
  const pdfDoc = await PDFDocument.load(templateBytes);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const firstPage = pdfDoc.getPages()[0];

  // 2. Stamp the data onto the PDF at pre-defined coordinates
  // This is a placeholder implementation. A real implementation would need
  // a mapping of field labels to coordinates.
  let yPosition = 700; // Starting Y position from top of page
  for (const [key, value] of Object.entries(filledData)) {
    firstPage.drawText(`${key}: ${value}`, {
      x: 72, // 1 inch from the left
      y: yPosition,
      font,
      size: 12,
      color: rgb(0.1, 0.1, 0.1),
    });
    yPosition -= 20; // Move down for the next line
  }

  // 3. Save the modified PDF to a buffer
  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
