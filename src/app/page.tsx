import Link from "next/link";
import { LookupForm } from "@/components/LookupForm";

export default function Home() {
  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-4">
        <span className="tag w-fit bg-brand/20 text-brand">Non-custodial · 0% fee</span>
        <h1 className="text-4xl font-bold leading-tight text-gray-50">
          Your DXsale liquidity isn&apos;t gone.<br />
          It&apos;s stranded behind a dead frontend.
        </h1>
        <p className="max-w-2xl text-gray-400">
          Thousands of projects locked their LP on DXsale, then the interface went
          dark. If your lock has expired, the funds are <em>yours to claim right
          now</em> — there&apos;s just no button. This tool finds your lock and lets
          you unlock it <strong className="text-gray-200">yourself</strong>, signing
          in your own wallet. No private keys leave your machine. No fee.
        </p>
        <div className="flex gap-3">
          <Link href="/how-it-works" className="btn-ghost">How it works</Link>
          <a href="https://github.com/" target="_blank" rel="noreferrer" className="btn-ghost">
            Read the source
          </a>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-gray-100">Find your lock</h2>
        <LookupForm />
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {[
          ["1. Find", "Enter your lock address or launch wallet. We read the chain and decode the lock — expired? withdrawn? how much is inside?"],
          ["2. Verify", "Connect the authorized wallet. The unlock function only obeys the original owner — we confirm it's you before anything happens."],
          ["3. Recover", "You sign refundUniLP() in your own wallet. The LP lands back with you. Cost: gas. Fee: zero."],
        ].map(([h, b]) => (
          <div key={h} className="panel p-5">
            <h3 className="font-semibold text-brand">{h}</h3>
            <p className="mt-2 text-sm text-gray-400">{b}</p>
          </div>
        ))}
      </section>

      <section className="panel border-warn/40 bg-warn/5 p-5">
        <h3 className="font-semibold text-warn">Why not the &ldquo;official&rdquo; legacy tool?</h3>
        <p className="mt-2 text-sm text-gray-300">
          The legacy recovery site charges a <strong>40% minimum fee — up to 100%</strong>{" "}
          if its AI flags your token as &ldquo;scam&rdquo; — to hand back funds that are
          already yours, routing the cut to a hardcoded wallet. This tool does the same
          job for the cost of gas, and never touches your money.{" "}
          <Link href="/how-it-works" className="text-brand underline">See the evidence →</Link>
        </p>
      </section>
    </div>
  );
}
