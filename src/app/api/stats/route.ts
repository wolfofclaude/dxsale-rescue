import { NextResponse } from "next/server";
import { analyzeMany, discoverCandidates } from "@/lib/scanner";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Aggregate stats only — deliberately NOT a browsable list of owners/locks,
// so this can't be used as a target list. Each owner looks up their own lock.
export async function GET() {
  try {
    const candidates = await discoverCandidates();
    const reports = await analyzeMany(candidates);

    const tally: Record<string, number> = {};
    let recoverableUsd = 0;
    for (const r of reports) {
      tally[r.status] = (tally[r.status] || 0) + 1;
      if (r.status === "RECOVERABLE") recoverableUsd += r.estUsd ?? 0;
    }

    return NextResponse.json({
      scanned: candidates.length,
      recoverable: tally["RECOVERABLE"] || 0,
      recoverableUsd,
      stillLocked: tally["locked"] || 0,
      emptyOrWithdrawn: tally["empty"] || 0,
      needsReview: (tally["review"] || 0) + (tally["withdrawn-flag"] || 0),
      generatedAt: new Date().toISOString(),
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Stats unavailable. Set FACTORY + ETHERSCAN_API_KEY." },
      { status: 500 },
    );
  }
}
