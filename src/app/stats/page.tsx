"use client";

import { useState } from "react";

interface Stats {
  scanned: number; recoverable: number; recoverableUsd: number;
  stillLocked: number; emptyOrWithdrawn: number; needsReview: number;
  generatedAt: string;
}

export default function StatsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/stats");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      setStats(json);
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  }

  const cards = stats ? [
    ["Locks scanned", stats.scanned.toLocaleString()],
    ["Recoverable now", stats.recoverable.toLocaleString()],
    ["Value reachable", `$${stats.recoverableUsd.toLocaleString()}`],
    ["Still locked", stats.stillLocked.toLocaleString()],
    ["Empty / withdrawn", stats.emptyOrWithdrawn.toLocaleString()],
    ["Needs review", stats.needsReview.toLocaleString()],
  ] : [];

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-bold text-gray-50">Stranded liquidity, in aggregate</h1>
        <p className="mt-2 max-w-2xl text-gray-400">
          Live scan of DXsale locks on BNB Smart Chain. We show totals only — never a
          browsable list of owners — so this can&apos;t become a target list. To recover,
          an owner looks up their own lock on the home page.
        </p>
      </header>

      {!stats && (
        <button onClick={load} disabled={loading} className="btn-brand w-fit">
          {loading ? "Scanning the chain…" : "Run the scan"}
        </button>
      )}
      {error && (
        <p className="text-sm text-danger">
          {error} <span className="text-gray-500">(needs FACTORY + ETHERSCAN_API_KEY configured)</span>
        </p>
      )}

      {stats && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            {cards.map(([label, value]) => (
              <div key={label} className="panel p-5">
                <div className="text-2xl font-bold text-gray-50">{value}</div>
                <div className="mt-1 text-sm text-gray-400">{label}</div>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500">
            Generated {new Date(stats.generatedAt).toLocaleString()}.
          </p>
        </>
      )}
    </div>
  );
}
