import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { clientKey, rateLimit } from "@/lib/rate-limit";

/** Public list of active partner doctors for patient selection */
export async function GET(request: NextRequest) {
  const limited = rateLimit({
    key: clientKey(request, "partners"),
    limit: 60,
    windowMs: 60_000,
  });
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } }
    );
  }

  const doctors = await prisma.user.findMany({
    where: { role: "doctor", active: true },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      nmcNumber: true,
    },
  });

  // Include simple speed metric: avg minutes to resolve medical certificates
  const withStats = await Promise.all(
    doctors.map(async (doc) => {
      const completed = await prisma.statusHistory.findMany({
        where: {
          actorId: doc.id,
          toStatus: { in: ["approved", "declined"] },
        },
        take: 20,
        orderBy: { createdAt: "desc" },
        include: { request: true },
      });

      let avgMinutes: number | null = null;
      if (completed.length > 0) {
        const diffs = completed
          .filter((h) => h.request.type === "medical_certificate")
          .map((h) => {
            const start = new Date(h.request.createdAt).getTime();
            const end = new Date(h.createdAt).getTime();
            return (end - start) / 60000;
          })
          .filter((m) => m > 0 && m < 24 * 60);

        if (diffs.length > 0) {
          avgMinutes = Math.round(
            diffs.reduce((a, b) => a + b, 0) / diffs.length
          );
        }
      }

      return {
        id: doc.id,
        name: doc.name,
        nmcNumber: doc.nmcNumber,
        avgResponseMinutes: avgMinutes,
      };
    })
  );

  return NextResponse.json(withStats);
}
