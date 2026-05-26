import { NextResponse } from "next/server";
import { ethers } from "ethers";
import { analyzeMany, discoverCandidates } from "@/lib/scanner";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const lock = url.searchParams.get("lock");
  const wallet = url.searchParams.get("wallet");

  try {
    if (lock) {
      if (!ethers.isAddress(lock)) {
        return NextResponse.json({ error: "Invalid lock address." }, { status: 400 });
      }
      const results = await analyzeMany([ethers.getAddress(lock)]);
      return NextResponse.json({ results });
    }

    if (wallet) {
      if (!ethers.isAddress(wallet)) {
        return NextResponse.json({ error: "Invalid wallet address." }, { status: 400 });
      }
      const target = ethers.getAddress(wallet).toLowerCase();
      const candidates = await discoverCandidates(); // needs FACTORY + API key
      const reports = await analyzeMany(candidates);
      const results = reports.filter(
        (r) => r.authorizedCaller?.toLowerCase() === target,
      );
      return NextResponse.json({ results });
    }

    return NextResponse.json({ error: "Provide ?lock= or ?wallet=" }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Lookup failed." },
      { status: 500 },
    );
  }
}
