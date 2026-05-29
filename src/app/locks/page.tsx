import Link from "next/link";
import type { Metadata } from "next";
import { libraryRows, registryMeta, aggregateStats, type LibraryEntry } from "@/lib/library";
import { getBnbUsd } from "@/lib/price";
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
}: { searchParams?: { filter?: string; sort?: string; q?: string } }) {
  const meta = registryMeta();
  const stats = aggregateStats();
  const bnb = await getBnbUsd();
  const scale = bnb / (meta.bnbUsd || 600); // rescale snapshot values to live price

  const f = (["recoverable", "locked", "all"].includes(searchParams?.filter || "")
    ? searchParams!.filter : "recoverable") as Filter;
  const sort = (searchParams?.sort === "value" || searchParams?.sort === "date"
    ? searchParams.sort : f === "locked" ? "date" : "value") as Sort;
  const q = (searchParams?.q || "").trim();
  const ql = q.toLowerCase();

  // Build a /locks href that preserves the active filter, sort, and search.
  const hrefFor = (next: { filter?: Filter; sort?: Sort }) => {
    const p = new URLSearchParams();
    p.set("filter", next.filter ?? f);
    p.set("sort", next.sort ?? sort);
    if (q) p.set("q", q);
    return `/locks?${p.toString()}`;
  };

  const all = libraryRows();
  const byStatus = f === "all" ? all : all.filter((r) => r.status === (f === "locked" ? "locked" : "RECOVERABLE"));
  const searched = ql
    ? byStatus.filter((r) =>
        (r.token && r.token.toLowerCase().includes(ql)) ||
        (r.tokenAddress && r.tokenAddress.toLowerCase().includes(ql)) ||
        r.address.toLowerCase().includes(ql))
    : byStatus;
  // While searching, surface every match; otherwise drop dust / unpriced noise.
  const picked = ql ? searched : searched.filter((r) => (r.estUsd ?? 0) * scale > 10);
  const rows = sortRows(picked, sort);
  const shown = rows.slice(0, MAX_ROWS);
  const display = shown.map((r) => ({
    r,
    days: daysUntil(r.unlockTime),
    valueUsd: r.estUsd != null ? r.estUsd * scale : r.estUsd,
  }));

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
        {/* Project search (server-rendered via GET; works without JS). */}
        <form method="get" action="/locks" className="relative">
          <input type="hidden" name="filter" value={f} />
          <input type="hidden" name="sort" value={sort} />
          <span aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.6" /><path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
          </span>
          <input
            name="q"
            defaultValue={q}
            autoComplete="off"
            spellCheck={false}
            placeholder="Search projects by name, token, or contract address"
            className="w-full rounded-lg border border-edge bg-panel/80 py-2.5 pl-10 pr-32 text-sm text-gray-100 placeholder:text-gray-600 outline-none transition focus:border-gray-400"
          />
          <div className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center gap-1">
            {q && (
              <Link href={`/locks?filter=${f}&sort=${sort}`} aria-label="Clear search"
                className="rounded-md px-2 py-1.5 text-sm text-gray-500 transition hover:text-gray-200">Clear</Link>
            )}
            <button type="submit" className="btn-brand !px-3.5 !py-1.5">Search</button>
          </div>
        </form>

        <div className="flex flex-col gap-3 border-b border-edge pb-3 sm:flex-row sm:flex-wrap sm:items-end sm:gap-6 sm:pb-0">
          <div className="flex items-end gap-5 overflow-x-auto sm:gap-6 sm:overflow-visible">
            {tabs.map(([key, label, n]) => (
              <Link key={key} href={hrefFor({ filter: key })}
                className={`shrink-0 whitespace-nowrap pb-1 text-sm transition sm:-mb-px sm:border-b-2 sm:pb-3 ${
                  f === key
                    ? "text-gray-50 sm:border-gray-50"
                    : "text-gray-400 hover:text-gray-200 sm:border-transparent"
                }`}>
                {label} <span className="ml-1 text-xs text-gray-600">{n.toLocaleString()}</span>
              </Link>
            ))}
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-500 sm:ml-auto sm:pb-3">
            <span className="text-gray-600">Sort</span>
            <Link href={hrefFor({ sort: "date" })}
              className={sort === "date" ? "text-gray-100" : "hover:text-gray-200"}>soonest unlock</Link>
            <span className="text-gray-700">/</span>
            <Link href={hrefFor({ sort: "value" })}
              className={sort === "value" ? "text-gray-100" : "hover:text-gray-200"}>value</Link>
          </div>
        </div>

        {/* Card grid across all breakpoints: 1 / 2 / 3 columns. The recover button
            is always a full-width tap target, no horizontal scrolling anywhere. */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {display.map(({ r, days: d, valueUsd }) => {
            const recoverable = r.status === "RECOVERABLE";
            return (
              <div key={r.address}
                className={`group relative flex flex-col overflow-hidden rounded-xl border bg-panel p-5 transition duration-200 hover:-translate-y-0.5 hover:shadow-glow ${recoverable ? "border-brand/30 hover:border-brand/60" : "border-edge hover:border-gray-600"}`}>
                {recoverable && <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand/70 to-transparent" />}

                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 truncate text-lg font-semibold text-gray-50" title={r.token || undefined}>{r.token || "Unknown token"}</div>
                  <div className="shrink-0 text-right">
                    <div className="label">Value</div>
                    <div className={`nums text-2xl font-semibold tracking-tight ${(r.estUsd ?? 0) > 0 ? "text-brand" : "text-gray-500"}`}>{usd(valueUsd)}</div>
                  </div>
                </div>

                <dl className="mt-4 grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-2.5 border-t border-edge/60 pt-4 text-sm">
                  <dt className="text-gray-500">{f === "locked" ? "Unlocks" : "Unlocked"}</dt>
                  <dd className="text-right font-mono text-gray-300">
                    {f === "locked" && d != null && d > 0
                      ? `${d}d (${r.unlockTime?.slice(0, 10)})`
                      : (r.unlockTime?.slice(0, 10) || "·")}
                  </dd>
                  <dt className="text-gray-500">Lock</dt>
                  <dd className="flex justify-end"><Address value={r.address} kind="address" /></dd>
                  {r.tokenAddress && (
                    <>
                      <dt className="text-gray-500">Token</dt>
                      <dd className="flex justify-end"><Address value={r.tokenAddress} kind="token" /></dd>
                    </>
                  )}
                </dl>

                <Link href={`/recover?lock=${r.address}`}
                  className={`mt-5 w-full ${recoverable ? "btn-brand" : "btn-ghost"}`}>
                  {recoverable ? "Recover this lock" : "View details"}
                </Link>
              </div>
            );
          })}
          {display.length === 0 && (
            <div className="col-span-full rounded-xl border border-edge bg-panel py-16 text-center text-gray-500">
              {ql ? <>No projects match &ldquo;{q}&rdquo; in this view.</> : "No locks in this view."}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1 text-xs text-gray-600 sm:flex-row sm:items-center sm:justify-between">
          <span>
            {ql
              ? `${rows.length.toLocaleString()} ${rows.length === 1 ? "match" : "matches"} for “${q}”.`
              : rows.length > MAX_ROWS
                ? `Showing top ${MAX_ROWS} of ${rows.length.toLocaleString()} locks above $10.`
                : `${rows.length.toLocaleString()} locks above $10.`}
          </span>
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
