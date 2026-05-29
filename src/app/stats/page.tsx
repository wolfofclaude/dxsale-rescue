import type { Metadata } from "next";
import { aggregateStats, registryMeta } from "@/lib/library";
import { getBnbUsd } from "@/lib/price";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Stats",
  description:
    "Total value locked across funded DXsale locks on BNB Smart Chain, with recoverable " +
    "and still-locked breakdowns. Totals only.",
  alternates: { canonical: "/stats" },
};

export default async function StatsPage() {
  const s = aggregateStats();
  const meta = registryMeta();
  const bnb = await getBnbUsd();
  const scale = bnb / (meta.bnbUsd || 600);
  const m = (n: number) => `$${Math.round(n * scale).toLocaleString()}`;

  const cards: [string, string, boolean][] = [
    ["Total value locked", m(s.tvlUsd), true],
    ["Recoverable value", m(s.recoverableUsd), true],
    ["Locked value", m(s.lockedUsd), true],
    ["Recoverable locks", s.recoverable.toLocaleString(), false],
    ["Still locked", s.stillLocked.toLocaleString(), false],
    ["Funded locks", (s.recoverable + s.stillLocked).toLocaleString(), false],
  ];

  return (
    <div className="flex flex-col gap-12">
      <header className="flex flex-col gap-3">
        <span className="label">Aggregate totals</span>
        <h1 className="text-4xl leading-tight">Value, in aggregate</h1>
        <p className="max-w-xl text-sm leading-relaxed text-gray-400">
          Decoded from the DXsale lock library on BNB Smart Chain. Totals only, never a
          browsable list of owners. To recover, an owner looks up their own lock.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-px overflow-hidden rounded-md border border-edge bg-edge sm:grid-cols-3">
        {cards.map(([label, value, accent]) => (
          <div key={label} className="bg-panel px-6 py-8">
            <div className="label">{label}</div>
            <div className={`mt-3 nums text-3xl font-semibold tracking-tight ${accent ? "text-brand" : "text-gray-50"}`}>{value}</div>
          </div>
        ))}
      </div>

      <p className="border-t border-edge pt-6 text-xs text-gray-500">
        Library updated {meta.updated}. BNB priced at ${bnb.toLocaleString()} live via
        CoinGecko; values track it for BNB-denominated pools.
      </p>
    </div>
  );
}
