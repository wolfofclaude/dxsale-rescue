import { NextResponse } from "next/server";
import { enrichLibrary, registryMeta } from "@/lib/library";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// The open lock library, enriched with live on-chain status.
export async function GET() {
  try {
    const enriched = await enrichLibrary();
    // Sort: recoverable first (by value), then everything else.
    enriched.sort((a, b) => {
      const score = (r: typeof a) => (r.status === "RECOVERABLE" ? 1e15 + (r.estUsd ?? 0) : (r.estUsd ?? 0));
      return score(b) - score(a);
    });
    // Deliberately omit `authorizedCaller` here so the public library can't be
    // used as a target list. Owners see/verify their own wallet via /api/lookup.
    const rows = enriched.map(({ authorizedCaller, ...rest }) => rest);
    return NextResponse.json({ ...registryMeta(), rows });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to load library." }, { status: 500 });
  }
}
