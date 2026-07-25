import { NextRequest, NextResponse } from "next/server";
import { getRequestByAccessToken } from "@/lib/store";
import {
  certificatePdfFilename,
  generateCertificatePdf,
} from "@/lib/services/certificate-pdf";

/**
 * Download medical certificate PDF (patient access-token only).
 * GET /api/requests/[id]/certificate?token=...
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Access token required" }, { status: 401 });
  }

  const consult = await getRequestByAccessToken(id, token);
  if (!consult) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }

  if (consult.status !== "approved" || !consult.certificate) {
    return NextResponse.json(
      { error: "Certificate is not available yet" },
      { status: 404 }
    );
  }

  const pdf = await generateCertificatePdf(consult.certificate);
  const filename = certificatePdfFilename(consult.certificate);

  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
