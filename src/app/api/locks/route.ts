import { NextResponse } from "next/server";
import { sortedRows, registryMeta } from "@/lib/library";

// Serves the pre-computed lock library (instant; no on-chain calls). Owner
// wallets are not part of the index, so this can't be used as a target list.
export async function GET(req: Request) {
  const filter = new URL(req.url).searchParams.get("filter") === "recoverable"
    ? "recoverable" : undefined;
  return NextResponse.json({ ...registryMeta(), rows: sortedRows(filter) });
}
