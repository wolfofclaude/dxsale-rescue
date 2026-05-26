export default function HowItWorks() {
  return (
    <article className="prose-invert mx-auto max-w-2xl flex flex-col gap-8">
      <header>
        <h1 className="text-3xl font-bold text-gray-50">How it works</h1>
        <p className="mt-2 text-gray-400">
          The honest, non-custodial version of DXsale liquidity recovery — and why the
          &ldquo;official&rdquo; legacy tool is something you should never use.
        </p>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold text-gray-100">The problem</h2>
        <p className="text-gray-400">
          DXsale let projects lock their PancakeSwap LP to prove they wouldn&apos;t rug.
          The LP sits in a per-launch lock contract until an unlock timestamp passes.
          Then DXsale&apos;s frontend went away. The contracts still work perfectly — but
          with no UI, owners have no obvious way to call them. Expired, claimable
          liquidity just sits there, reachable only by someone who can talk to the
          contract directly.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold text-gray-100">How we decode a lock safely</h2>
        <p className="text-gray-400">
          We anchor on a lock that&apos;s already been verified by hand
          (<code className="text-gray-200">0x3059…fbf7</code>). Any lock whose deployed
          bytecode hashes identically shares the exact same storage layout, so the slots
          are guaranteed to mean the same thing:
        </p>
        <ul className="list-disc pl-6 text-sm text-gray-400">
          <li><code className="text-gray-200">slot 3</code> — the authorized caller: the one wallet allowed to unlock.</li>
          <li><code className="text-gray-200">slot 4</code> — the unlock timestamp.</li>
          <li><code className="text-gray-200">slot 6</code> (bits <code>{">>"}160 &amp; 0xff</code>) — the &ldquo;already withdrawn&rdquo; flag.</li>
        </ul>
        <p className="text-gray-400">
          The unlock function is <code className="text-gray-200">refundUniLP()</code>, selector{" "}
          <code className="text-brand">0xe50a4f80</code>. Locks with different bytecode are
          flagged for manual review rather than decoded blindly.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold text-gray-100">A real recovery</h2>
        <p className="text-gray-400">
          The reference lock held ~146 PancakeSwap LP — roughly 29.7 WBNB of liquidity —
          from a 2021 launch, expired in June 2024, never withdrawn. The catch: the
          authorized wallet in slot 3 was the original <em>deployer</em>, not the
          contract&apos;s <code className="text-gray-200">owner()</code>. Call it from the
          wrong address and it just reverts — which is exactly why most people assumed it
          was bricked and walked away. Called correctly, the LP released for the cost of
          gas. <span className="text-brand">0% fee.</span>
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold text-danger">The &ldquo;official&rdquo; tool charges 40–100%</h2>
        <p className="text-gray-400">
          The legacy recovery site people get funneled to is a real multi-method LP
          extractor — but it sets its fee from an AI &ldquo;scam check&rdquo;:
        </p>
        <pre className="overflow-x-auto rounded-lg border border-edge bg-ink p-4 text-xs text-gray-300">
          <code>{`feeBps: o.isScam ? 1e4 : 4e3   //  40% normal, 100% if "scam"`}</code>
        </pre>
        <p className="text-gray-400">
          A <strong>40% minimum</strong>, defaulting to 40% even when the AI check errors,
          and <strong>100%</strong> for anything it flags — paid out to a hardcoded
          collector wallet, and labeled to you on screen as &ldquo;verification
          complete.&rdquo; For a reflection token (the kind these checks love to flag) it
          would take essentially everything. It is not a criminal drainer — it&apos;s an
          official-but-extortionate fee tool. Either way: it&apos;s your money, and you
          don&apos;t need to give anyone 40% of it.
        </p>
      </section>

      <section className="panel p-5">
        <h2 className="text-lg font-semibold text-brand">What this tool does instead</h2>
        <p className="mt-2 text-sm text-gray-400">
          Finds your lock, confirms you&apos;re the authorized owner, and lets you sign{" "}
          <code className="text-gray-200">refundUniLP()</code> in your own wallet. The
          funds go straight to you. The code is open source — read it, run it locally,
          or use this hosted copy. We never custody anything and never take a cut.
        </p>
      </section>
    </article>
  );
}
