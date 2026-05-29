import Link from "next/link";
import type { Metadata } from "next";
import { libraryRows, registryMeta, aggregateStats, type LibraryEntry } from "@/lib/library";
import { getBnbUsd } from "@/lib/price";
import { StatusTag } from "@/components/StatusTag";
import { Address } from "@/components/Address";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Lock library",
  description:
    "Funded DXsale LP locks on BNB Smart Chain: recoverable and still-locked, with token " +
    "contract, value, and total value locked. Owner wallets omitted.",
  alternates: { canonical: "/locks" },
};

type Filter = "recoverable" | "locked" | "all";
type Sort = "value" | "date";
const MAX_ROWS = 500;

function daysUntil(iso?: string | null): number | null {
  if (!iso) return null;
  return Math.round((new Date(iso).getTime() - Date.now()) / 86_400_000);
}
function sortRows(rows: LibraryEntry[], sort: Sort): LibraryEntry[] {
  if (sort === "date") {
    return [...rows].sort((a, b) =>
      new Date(a.unlockTime ?? 0).getTime() - new Date(b.unlockTime ?? 0).getTime());
  }
  return [...rows].sort((a, b) => (b.estUsd ?? 0) - (a.estUsd ?? 0));
}
function usd(n?: number | null) {
  return n != null && n > 0 ? `$${Math.round(n).toLocaleString()}` : n === 0 ? "$0" : "·";
}

export default async function LocksPage({
  searchParams,
}: { searchParams?: { filter?: string; sort?: string } }) {
  const meta = registryMeta();
  const stats = aggregateStats();
  const bnb = await getBnbUsd();
  const scale = bnb / (meta.bnbUsd || 600); // rescale snapshot values to live price

  const f = (["recoverable", "locked", "all"].includes(searchParams?.filter || "")
    ? searchParams!.filter : "recoverable") as Filter;
  const sort = (searchParams?.sort === "value" || searchParams?.sort === "date"
    ? searchParams.sort : f === "locked" ? "date" : "value") as Sort;

  const all = libraryRows();
  const byStatus = f === "all" ? all : all.filter((r) => r.status === (f === "locked" ? "locked" : "RECOVERABLE"));
  // Public view: show every lock worth more than $10 (drops dust / unpriced noise).
  const picked = byStatus.filter((r) => (r.estUsd ?? 0) * scale > 10);
  const rows = sortRows(picked, sort);
  const shown = rows.slice(0, MAX_ROWS);

  const stat = [
    ["Total value locked", `$${Math.round(stats.tvlUsd * scale).toLocaleString()}`, true],
    ["Recoverable now", `$${Math.round(stats.recoverableUsd * scale).toLocaleString()}`, true],
    ["Recoverable locks", stats.recoverable.toLocaleString(), false],
    ["Still locked", stats.stillLocked.toLocaleString(), false],
  ] as const;

  const tabs: [Filter, string, number][] = [
    ["recoverable", "Recoverable", stats.recoverable],
    ["locked", "Still locked", stats.stillLocked],
    ["all", "All funded", stats.recoverable + stats.stillLocked],
  ];

  return (
    <div className="flex flex-col gap-12">
      <header className="flex flex-col gap-3">
        <span className="label">On-chain library</span>
        <h1 className="text-4xl leading-tight">Lock library</h1>
        <p className="max-w-xl text-sm leading-relaxed text-gray-400">
          Every funded DXsale LP lock on BNB Smart Chain, decoded on-chain. Each is
          recoverable only by its rightful owner. This lists projects, never people.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-edge bg-edge sm:grid-cols-4">
        {stat.map(([label, value, accent]) => (
          <div key={label} className="bg-panel px-5 py-6">
            <div className="label">{label}</div>
            <div className={`mt-2 nums text-2xl font-semibold tracking-tight ${accent ? "text-brand" : "text-gray-50"}`}>{value}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-end gap-6 border-b border-edge">
          {tabs.map(([key, label, n]) => (
            <Link key={key} href={`/locks?filter=${key}`}
              className={`-mb-px border-b-2 pb-3 text-sm transition ${f === key ? "border-gray-50 text-gray-50" : "border-transparent text-gray-400 hover:text-gray-200"}`}>
              {label} <span className="ml-1 text-xs text-gray-600">{n.toLocaleString()}</span>
            </Link>
          ))}
          <div className="ml-auto flex items-center gap-3 pb-3 text-xs text-gray-500">
            <span className="text-gray-600">Sort</span>
            <Link href={`/locks?filter=${f}&sort=date`}
              className={sort === "date" ? "text-gray-100" : "hover:text-gray-200"}>soonest unlock</Link>
            <span className="text-gray-700">/</span>
            <Link href={`/locks?filter=${f}&sort=value`}
              className={sort === "value" ? "text-gray-100" : "hover:text-gray-200"}>value</Link>
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-edge bg-panel">
          <table className="zen-table">
            <thead>
              <tr>
                <th>Project</th>
                <th>Token contract</th>
                <th>Lock contract</th>
                <th className="!text-right">Value</th>
                <th>{f === "locked" ? "Unlocks in" : "Unlocked"}</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => {
                const d = daysUntil(r.unlockTime);
                return (
                  <tr key={r.address}>
                    <td className="font-medium text-gray-50">{r.token || "·"}</td>
                    <td>{r.tokenAddress ? <Address value={r.tokenAddress} kind="token" /> : <span className="text-gray-600">·</span>}</td>
                    <td><Address value={r.address} kind="address" /></td>
                    <td className={`!text-right font-mono ${(r.estUsd ?? 0) > 0 ? "text-brand" : "text-gray-500"}`}>{usd(r.estUsd != null ? r.estUsd * scale : r.estUsd)}</td>
                    <td className="font-mono text-xs text-gray-400">
                      {f === "locked" && d != null && d > 0
                        ? <span className="text-gray-200">{d}d <span className="text-gray-500">({r.unlockTime?.slice(0, 10)})</span></span>
                        : (r.unlockTime?.slice(0, 10) || "·")}
                    </td>
                    <td><StatusTag status={r.status} /></td>
                    <td className="!text-right">
                      <Link href={`/recover?lock=${r.address}`}
                        className={r.status === "RECOVERABLE" ? "text-brand hover:underline" : "text-gray-500 hover:underline"}>
                        {r.status === "RECOVERABLE" ? "Recover" : "View"}
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {shown.length === 0 && (
                <tr><td colSpan={7} className="!py-12 text-center text-gray-500">No locks in this view.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between text-xs text-gray-600">
          <span>{rows.length > MAX_ROWS ? `Showing top ${MAX_ROWS} of ${rows.length.toLocaleString()} locks above $10.` : `${rows.length.toLocaleString()} locks above $10.`}</span>
          <span>BNB ${bnb.toLocaleString()} via CoinGecko · updated {meta.updated}</span>
        </div>
      </div>

      <p className="border-t border-edge pt-6 text-xs leading-relaxed text-gray-500">
        Owner wallets are intentionally omitted. To recover, the rightful owner opens a lock
        and connects their own authorized wallet. Values track the live BNB price for
        BNB-denominated pools.
      </p>
    </div>
  );
}
