import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * Liveness probe for Railway / load balancers.
 * Always returns 200 once the Node process is up so deploys aren't
 * killed while SQLite is still initializing. DB status is reported
 * in the JSON body for debugging.
 */
export async function GET() {
  let database: "connected" | "disconnected" = "disconnected";

  try {
    await prisma.$queryRaw`SELECT 1`;
    database = "connected";
  } catch (err) {
    console.error("[health] database check failed:", err);
  }

  return NextResponse.json(
    {
      status: "ok",
      database,
      time: new Date().toISOString(),
    },
    { status: 200 }
  );
}
