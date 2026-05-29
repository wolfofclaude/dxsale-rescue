import { NextResponse } from "next/server";
import { aggregateStats, registryMeta } from "@/lib/library";

// Aggregate stats from the pre-computed index. Totals only — no per-owner list.
export async function GET() {
  return NextResponse.json({
    ...aggregateStats(),
    updated: registryMeta().updated,
    generatedAt: new Date().toISOString(),
  });
}
