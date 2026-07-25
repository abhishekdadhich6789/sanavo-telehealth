import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { MedicalCertificateDocument } from "@/lib/types";

function typeLabel(type: MedicalCertificateDocument["certificateType"]): string {
  if (type === "work") return "Work / Sick Leave";
  if (type === "school") return "School / University";
  return "Carer's Leave";
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

/**
 * Generate a printable A4 medical certificate PDF.
 * Returns a Buffer suitable for email attachment or HTTP download.
 */
export async function generateCertificatePdf(
  cert: MedicalCertificateDocument
): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]); // A4
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const margin = 56;
  const width = page.getWidth() - margin * 2;
  let y = page.getHeight() - margin;

  const drawCentered = (
    text: string,
    size: number,
    bold = false,
    color = rgb(0.1, 0.15, 0.2)
  ) => {
    const f = bold ? fontBold : font;
    const textWidth = f.widthOfTextAtSize(text, size);
    page.drawText(text, {
      x: margin + (width - textWidth) / 2,
      y,
      size,
      font: f,
      color,
    });
    y -= size + 8;
  };

  const drawLeft = (
    text: string,
    size: number,
    bold = false,
    color = rgb(0.15, 0.2, 0.25)
  ) => {
    const f = bold ? fontBold : font;
    page.drawText(text, {
      x: margin,
      y,
      size,
      font: f,
      color,
    });
    y -= size + 10;
  };

  const wrapText = (text: string, size: number, maxWidth: number): string[] => {
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let line = "";
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(next, size) > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = next;
      }
    }
    if (line) lines.push(line);
    return lines;
  };

  // Border
  page.drawRectangle({
    x: 36,
    y: 36,
    width: page.getWidth() - 72,
    height: page.getHeight() - 72,
    borderColor: rgb(0.05, 0.45, 0.45),
    borderWidth: 1.5,
  });

  // Header
  drawCentered("Sanavo", 22, true, rgb(0.05, 0.45, 0.45));
  drawCentered("Medical Certificate", 16, true);
  y -= 6;

  page.drawLine({
    start: { x: margin, y },
    end: { x: margin + width, y },
    thickness: 1,
    color: rgb(0.75, 0.8, 0.82),
  });
  y -= 28;

  drawLeft(`Certificate No:  ${cert.certificateNumber}`, 11, true);
  drawLeft(`Date Issued:     ${formatDate(cert.issuedAt)}`, 11);
  drawLeft(`Certificate Type: ${typeLabel(cert.certificateType)}`, 11);
  y -= 12;

  const body = `This is to certify that ${cert.patientName} was examined via telehealth and is medically unfit for ${typeLabel(cert.certificateType).toLowerCase()} from ${formatDate(cert.startDate)} to ${formatDate(cert.endDate)} (inclusive), for a total of ${cert.approvedDays} day(s).`;

  for (const line of wrapText(body, 11, width)) {
    drawLeft(line, 11);
  }

  y -= 20;
  drawLeft("Issued by", 10, true, rgb(0.4, 0.45, 0.5));
  drawLeft(`Dr. ${cert.doctorName}`, 12, true);
  drawLeft(`NMC / State Medical Council Reg: ${cert.nmcNumber || "N/A"}`, 10);
  y -= 16;

  drawLeft(
    "This certificate was issued through the Sanavo telehealth platform",
    9,
    false,
    rgb(0.45, 0.5, 0.55)
  );
  drawLeft(
    "after clinical review by an NMC-registered partner doctor.",
    9,
    false,
    rgb(0.45, 0.5, 0.55)
  );

  y = 72;
  page.drawLine({
    start: { x: margin, y: y + 20 },
    end: { x: margin + width, y: y + 20 },
    thickness: 0.5,
    color: rgb(0.8, 0.82, 0.84),
  });
  drawCentered(
    "For verification, use the status link provided by Sanavo.",
    8,
    false,
    rgb(0.5, 0.55, 0.58)
  );

  const bytes = await doc.save();
  return Buffer.from(bytes);
}

export function certificatePdfFilename(cert: MedicalCertificateDocument): string {
  return `Sanavo-Certificate-${cert.certificateNumber}.pdf`;
}
