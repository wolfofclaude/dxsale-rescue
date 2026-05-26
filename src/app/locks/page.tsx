"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { LibraryRow } from "@/lib/library";
import { StatusTag } from "@/components/StatusTag";

export default function LocksPage() {
  const [rows, setRows] = useState<LibraryRow[] | null>(null);
  const [meta, setMeta] = useState<{ updated?: string; count?: number }>({});
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "recoverable">("all");

  useEffect(() => {
    fetch("/api/locks")
      .then((r) => r.json())
      .then((j) => { if (j.error) throw new Error(j.error); setRows(j.rows); setMeta({ updated: j.updated, count: j.count }); })
      .catch((e) => setError(e.message));
  }, []);

  const shown = (rows ?? []).filter((r) => filter === "all" || r.status === "RECOVERABLE");

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-bold text-gray-50">The open lock library</h1>
        <p className="mt-2 max-w-2xl text-gray-400">
          There&apos;s no public registry of DXsale locks anywhere — so here&apos;s one.
          Addresses are tracked in the open-source repo; status, value, and owner are read
          live from the chain. Find yours, or{" "}
          <a href="https://github.com/" target="_blank" rel="noreferrer" className="text-brand underline">
            contribute an address
          </a>.
        </p>
      </header>

      <div className="flex items-center gap-2 text-xs">
        <button onClick={() => setFilter("all")}
          className={`tag ${filter === "all" ? "bg-brand/20 text-brand" : "bg-edge text-gray-400"}`}>All</button>
        <button onClick={() => setFilter("recoverable")}
          className={`tag ${filter === "recoverable" ? "bg-brand/20 text-brand" : "bg-edge text-gray-400"}`}>Recoverable now</button>
        {meta.count != null && <span className="ml-auto text-gray-500">{meta.count} locks indexed</span>}
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}
      {!rows && !error && <p className="text-sm text-gray-400">Reading the chain…</p>}

      {rows && (
        <div className="panel overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-gray-500">
              <tr className="border-b border-edge">
                <th className="p-3">Token</th>
                <th className="p-3">Lock</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Est. value</th>
                <th className="p-3">Unlocks</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.address} className="border-b border-edge/50">
                  <td className="p-3 font-mono">{r.token || "—"}</td>
                  <td className="p-3 font-mono text-xs text-gray-400">
                    {r.address.slice(0, 8)}…{r.address.slice(-6)}
                  </td>
                  <td className="p-3"><StatusTag status={r.status} /></td>
                  <td className="p-3 text-right font-mono text-brand">
                    {r.estUsd != null ? `$${r.estUsd.toLocaleString()}` : "—"}
                  </td>
                  <td className="p-3 font-mono text-xs">{r.unlockTime?.slice(0, 10) || "—"}</td>
                  <td className="p-3 text-right">
                    {r.status === "RECOVERABLE"
                      ? <Link href={`/recover?lock=${r.address}`} className="text-brand underline">Recover →</Link>
                      : <Link href={`/recover?lock=${r.address}`} className="text-gray-500 underline">View</Link>}
                  </td>
                </tr>
              ))}
              {shown.length === 0 && (
                <tr><td colSpan={6} className="p-6 text-center text-gray-500">No locks match this filter.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-gray-500">
        Owner wallets are intentionally not listed here. To recover, the rightful owner
        opens a lock and connects their own authorized wallet.
      </p>
    </div>
  );
}
