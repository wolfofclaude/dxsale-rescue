"use client";

import { useState } from "react";
import Link from "next/link";
import type { LockReport } from "@/lib/chain";
import { StatusTag } from "./StatusTag";

export function LookupForm() {
  const [value, setValue] = useState("");
  const [mode, setMode] = useState<"lock" | "wallet">("lock");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<LockReport[] | null>(null);

  async function run(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null); setResults(null);
    try {
      const q = mode === "lock" ? `lock=${value.trim()}` : `wallet=${value.trim()}`;
      const res = await fetch(`/api/lookup?${q}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Lookup failed");
      setResults(json.results);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="panel p-6">
      <div className="mb-4 flex gap-2 text-xs">
        <button
          onClick={() => setMode("lock")}
          className={`tag ${mode === "lock" ? "bg-brand/20 text-brand" : "bg-edge text-gray-400"}`}
        >Lock address</button>
        <button
          onClick={() => setMode("wallet")}
          className={`tag ${mode === "wallet" ? "bg-brand/20 text-brand" : "bg-edge text-gray-400"}`}
        >My wallet</button>
      </div>

      <form onSubmit={run} className="flex flex-col gap-3 sm:flex-row">
        <input
          className="input"
          placeholder={mode === "lock"
            ? "0x… DXsale lock contract address"
            : "0x… the wallet that launched / owns the lock"}
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <button className="btn-brand whitespace-nowrap" disabled={loading || !value}>
          {loading ? "Scanning…" : "Find my LP"}
        </button>
      </form>

      {error && <p className="mt-4 text-sm text-danger">{error}</p>}

      {results && results.length === 0 && (
        <p className="mt-4 text-sm text-gray-400">No matching lock found for that input.</p>
      )}

      {results && results.map((r) => (
        <div key={r.address} className="mt-4 rounded-lg border border-edge p-4">
          <div className="flex items-center justify-between gap-3">
            <code className="text-xs text-gray-400 break-all">{r.address}</code>
            <StatusTag status={r.status} />
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-y-1 text-sm">
            {r.estUsd != null && (<><dt className="text-gray-500">Est. value</dt>
              <dd className="text-right font-mono text-brand">${r.estUsd.toLocaleString()}</dd></>)}
            {r.lpHeld && (<><dt className="text-gray-500">LP held</dt>
              <dd className="text-right font-mono">{Number(r.lpHeld).toFixed(4)}</dd></>)}
            {r.unlockTime && (<><dt className="text-gray-500">Unlocks</dt>
              <dd className="text-right font-mono">{r.unlockTime.slice(0, 10)}</dd></>)}
            {r.authorizedCaller && (<><dt className="text-gray-500">Owner wallet</dt>
              <dd className="text-right font-mono text-xs break-all">{r.authorizedCaller}</dd></>)}
          </dl>
          {r.note && <p className="mt-2 text-xs text-gray-500">{r.note}</p>}
          {r.status === "RECOVERABLE" && (
            <Link
              href={`/recover?lock=${r.address}`}
              className="btn-brand mt-3 w-full"
            >Recover this LP →</Link>
          )}
        </div>
      ))}
    </div>
  );
}
