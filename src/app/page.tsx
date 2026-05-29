import Link from "next/link";
import { LookupForm } from "@/components/LookupForm";
import { TipPanel } from "@/components/TipPanel";
import { aggregateStats, registryMeta } from "@/lib/library";
import { getBnbUsd } from "@/lib/price";

export const dynamic = "force-dynamic";

export default async function Home() {
  const meta = registryMeta();
  const stats = aggregateStats();
  const bnb = await getBnbUsd();
  const scale = bnb / (meta.bnbUsd || 600); // rescale snapshot values to live price
  const recoverableUsd = stats.recoverableUsd * scale;
  const lockedUsd = stats.lockedUsd * scale;
  const tvlUsd = stats.tvlUsd * scale;
  const fmtUsd = (n: number) =>
    n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : `$${Math.round(n).toLocaleString()}`;

  return (
    <div className="flex flex-col gap-16">
      <section className="relative isolate flex flex-col gap-6 pt-2 sm:pt-4">
        <div aria-hidden className="pointer-events-none absolute -top-24 left-1/2 -z-10 h-64 w-[36rem] max-w-[90vw] -translate-x-1/2 rounded-full bg-brand/10 blur-[90px]" />
        <div className="flex flex-wrap items-center gap-3">
          <span className="label">Liquidity recovery</span>
          <span className="rounded-full border border-edge px-2.5 py-0.5 text-[11px] text-gray-500">
            Independent &middot; not affiliated with DXsale
          </span>
        </div>
        <h1 className="max-w-2xl text-4xl leading-[1.1] tracking-tight sm:text-5xl md:text-6xl">
          Your liquidity isn&apos;t gone.<br />
          <span className="text-gray-400">It&apos;s waiting behind a dead door.</span>
        </h1>
        <p className="max-w-xl text-[15px] leading-relaxed text-gray-400">
          Thousands of projects locked their LP on DXsale, then the interface went dark.
          If your lock has expired, the funds are yours to claim. There&apos;s just no
          button. This finds your lock and opens it in{" "}
          <span className="text-gray-100">one signature</span> from your own wallet.
          Funds never leave your account. A flat 15%, the exact split shown before you
          sign.
        </p>
        <div className="flex gap-3 pt-1">
          <Link href="/locks" className="btn-brand">Browse the library</Link>
          <Link href="/how-it-works" className="btn-ghost">How it works</Link>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-edge bg-edge sm:grid-cols-3">
        <Link href="/locks?filter=recoverable" className="bg-panel px-6 py-7 transition hover:bg-panel/70">
          <div className="label">Recoverable right now</div>
          <div className="mt-2 nums text-4xl font-semibold tracking-tight text-brand">{fmtUsd(recoverableUsd)}</div>
          <div className="mt-1.5 text-xs text-gray-500">{stats.recoverable.toLocaleString()} projects you can unlock today &rarr;</div>
        </Link>
        <Link href="/locks?filter=locked" className="bg-panel px-6 py-7 transition hover:bg-panel/70">
          <div className="label">Still locked</div>
          <div className="mt-2 nums text-4xl font-semibold tracking-tight text-gray-50">{fmtUsd(lockedUsd)}</div>
          <div className="mt-1.5 text-xs text-gray-500">{stats.stillLocked.toLocaleString()} unlocking over time &rarr;</div>
        </Link>
        <Link href="/locks?filter=all" className="bg-panel px-6 py-7 transition hover:bg-panel/70">
          <div className="label">Total liquidity tracked</div>
          <div className="mt-2 nums text-4xl font-semibold tracking-tight text-gray-50">{fmtUsd(tvlUsd)}</div>
          <div className="mt-1.5 text-xs text-gray-500">across {(stats.recoverable + stats.stillLocked).toLocaleString()} DXsale locks &rarr;</div>
        </Link>
      </section>

      <section className="flex flex-col gap-6">
        <span className="label">What happened</span>
        <h2 className="max-w-2xl text-2xl leading-snug">
          {fmtUsd(tvlUsd)} in liquidity stranded behind a dead interface. Here&apos;s how,
          and who&apos;s circling it now.
        </h2>
        <div className="grid gap-px overflow-hidden rounded-md border border-edge bg-edge sm:grid-cols-3">
          <div className="bg-panel p-7">
            <div className="label text-gray-600">2021</div>
            <h3 className="mt-2 text-base text-gray-100">Locked to prove trust</h3>
            <p className="mt-2 text-sm leading-relaxed text-gray-400">
              Hundreds of BNB-chain projects locked their PancakeSwap LP on DXsale, so
              holders knew the team couldn&apos;t pull the rug.
            </p>
          </div>
          <div className="bg-panel p-7">
            <div className="label text-gray-600">Then</div>
            <h3 className="mt-2 text-base text-gray-100">The door closed</h3>
            <p className="mt-2 text-sm leading-relaxed text-gray-400">
              DXsale&apos;s frontend went dark. The lock contracts still work, but with no UI
              there&apos;s no button to call <code className="text-gray-300">refundUniLP()</code>.
              Expired LP just sits there.
            </p>
          </div>
          <div className="bg-panel p-7">
            <div className="label text-danger/80">Now</div>
            <h3 className="mt-2 text-base text-gray-100">Vultures circling</h3>
            <p className="mt-2 text-sm leading-relaxed text-gray-400">
              A drainer at <code className="text-gray-300">dxsale.one</code> impersonates the
              recovery flow and empties the wallets of people trying to get their own money back.
            </p>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-5">
        <h2 className="text-xl">Find your lock</h2>
        <LookupForm />
        <p className="text-xs text-gray-600">
          {fmtUsd(recoverableUsd)} sitting unlocked across {stats.recoverable.toLocaleString()} projects. Check if one is yours.
        </p>
      </section>

      <section className="grid gap-px overflow-hidden rounded-md border border-edge bg-edge sm:grid-cols-3">
        {[
          ["01 · Find", "Enter your lock or launch wallet. We read the chain and decode it: expired? how much is inside?"],
          ["02 · Verify", "Connect the authorized wallet. The unlock obeys only the original owner; we confirm it&apos;s you first."],
          ["03 · Recover", "One signature returns 85% to you, atomically. Funds never leave your wallet. Flat 15%, hardcoded."],
        ].map(([h, b]) => (
          <div key={h} className="bg-panel p-7">
            <h3 className="text-base text-brand">{h}</h3>
            <p className="mt-3 text-sm leading-relaxed text-gray-400" dangerouslySetInnerHTML={{ __html: b }} />
          </div>
        ))}
      </section>

      <section className="rounded-lg border border-danger/30 bg-danger/[0.04] p-7">
        <div className="flex items-center gap-2.5">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-danger/15 text-sm font-bold text-danger">!</span>
          <h3 className="text-base font-semibold text-gray-50">Do not use dxsale.one. It is a wallet drainer.</h3>
        </div>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-gray-400">
          The &ldquo;legacy recovery&rdquo; site circulating as DXsale&apos;s, <code className="text-gray-200">dxsale.one</code>,
          is malicious. We took apart its own JavaScript: it skims your tokens to a hardcoded
          wallet while the screen reads{" "}
          <span className="text-gray-200">&ldquo;Verification complete.&rdquo;</span>
        </p>
        <ul className="mt-4 grid gap-2 text-sm text-gray-400 sm:grid-cols-3">
          <li className="rounded-md border border-edge bg-panel/60 p-3">
            <span className="font-medium text-danger">40 to 100% fee</span><br />
            <span className="text-xs text-gray-500">its code: <code className="text-gray-300">feeBps: isScam?1e4:4e3</code></span>
          </li>
          <li className="rounded-md border border-edge bg-panel/60 p-3">
            <span className="font-medium text-danger">Hidden transfer</span><br />
            <span className="text-xs text-gray-500">sends to <code className="text-gray-300">0x7AC7…2cC1</code></span>
          </li>
          <li className="rounded-md border border-edge bg-panel/60 p-3">
            <span className="font-medium text-danger">1-signature 7702 drain</span><br />
            <span className="text-xs text-gray-500">delegates your wallet to its extractor</span>
          </li>
        </ul>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-gray-400">
          This tool is the opposite: a flat <span className="text-gray-100">15%</span>, the exact
          split shown before you sign, the rate hardcoded so it can never creep up, and funds never
          leave your wallet.{" "}
          <Link href="/how-it-works" className="text-brand hover:underline">See the full breakdown →</Link>
        </p>
      </section>

      <section className="flex flex-col items-start gap-5 rounded-lg border border-edge bg-panel p-8">
        <h2 className="max-w-xl text-2xl leading-snug">The honest way to get your liquidity back</h2>
        <ul className="flex flex-col gap-2 text-sm text-gray-400">
          <li><span className="mr-2 text-brand">&#10003;</span>Non-custodial: the unlock runs as your own wallet, so funds never leave it.</li>
          <li><span className="mr-2 text-brand">&#10003;</span>Flat 15%, hardcoded in a verified contract, with the split shown before you sign.</li>
          <li><span className="mr-2 text-brand">&#10003;</span>One signature, atomic: your lock opens and 85% returns to you in a single transaction.</li>
        </ul>
        <div className="flex flex-wrap gap-3 pt-1">
          <Link href="/locks?filter=recoverable" className="btn-brand">See what&apos;s recoverable</Link>
          <Link href="/how-it-works" className="btn-ghost">How it works</Link>
        </div>
        <p className="text-xs text-gray-600">Independent tool, not affiliated with DXsale. Your keys, your funds, always.</p>
      </section>

      <TipPanel />
    </div>
  );
}
