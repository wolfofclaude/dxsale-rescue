import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "How it works",
  description:
    "How DXsale Rescue decodes a lock (bytecode-anchored slots, refundUniLP selector " +
    "0xe50a4f80), recovers via EIP-7702 in one signature, charges a hardcoded 15% fee, " +
    "and why you can also recover for free. Includes code evidence that dxsale.one is a drainer.",
  alternates: { canonical: "/how-it-works" },
};

export default function HowItWorks() {
  return (
    <article className="mx-auto max-w-2xl flex flex-col gap-10">
      <header className="flex flex-col gap-3">
        <span className="label">Documentation</span>
        <h1 className="text-4xl leading-tight">How it works</h1>
        <p className="text-sm leading-relaxed text-gray-400">
          The honest, non-custodial way to recover DXsale liquidity, and proof from its own
          code that the dxsale.one &ldquo;recovery&rdquo; site is a wallet drainer.
        </p>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl">The problem</h2>
        <p className="text-sm leading-relaxed text-gray-400">
          DXsale let projects lock their PancakeSwap LP to prove they wouldn&apos;t rug.
          The LP sits in a per-launch lock contract until an unlock timestamp passes.
          Then DXsale&apos;s frontend went away. The contracts still work perfectly, but
          with no UI, owners have no obvious way to call them. Expired, claimable
          liquidity just sits there, reachable only by someone who can talk to the
          contract directly.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl">How we decode a lock safely</h2>
        <p className="text-sm leading-relaxed text-gray-400">
          We anchor on a lock verified by hand
          (<code className="text-gray-200">0x3059…fbf7</code>). Any lock whose deployed
          bytecode hashes identically shares the exact same storage layout, so the slots
          are guaranteed to mean the same thing:
        </p>
        <ul className="list-disc pl-6 text-sm leading-relaxed text-gray-400">
          <li><code className="text-gray-200">slot 2</code>: the project token contract.</li>
          <li><code className="text-gray-200">slot 3</code>: the authorized caller, the one wallet allowed to unlock.</li>
          <li><code className="text-gray-200">slot 4</code>: the unlock timestamp.</li>
          <li><code className="text-gray-200">slot 6</code>: the DEX factory.</li>
        </ul>
        <p className="text-sm leading-relaxed text-gray-400">
          The LP pair address is not stored, so we compute it with{" "}
          <code className="text-gray-200">factory.getPair(token, WBNB)</code> and read the
          lock&apos;s balance of it. The unlock function is{" "}
          <code className="text-gray-200">refundUniLP()</code>, selector{" "}
          <code className="text-brand">0xe50a4f80</code>. Locks with different bytecode are
          flagged for review rather than decoded blindly.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl">A real recovery</h2>
        <p className="text-sm leading-relaxed text-gray-400">
          The reference lock held ~146 PancakeSwap LP, roughly 29.7 WBNB of liquidity, from
          a 2021 launch, expired June 2024, never withdrawn. The catch: the authorized
          wallet in slot 3 was the original <em>deployer</em>, not the contract&apos;s{" "}
          <code className="text-gray-200">owner()</code>. Call it from the wrong address and
          it simply reverts, which is exactly why most people assumed it was bricked and
          walked away. Called correctly, the LP released for the cost of gas.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl text-danger">dxsale.one is a wallet drainer, and we read its code</h2>
        <p className="text-sm leading-relaxed text-gray-400">
          The &ldquo;legacy recovery&rdquo; site circulating as DXsale&apos;s,{" "}
          <code className="text-gray-200">lpsearch.dxsale.one</code>, is not an over-priced
          tool. It is malicious. We downloaded and de-obfuscated its JavaScript bundle. Here is
          what it does, in its own code.
        </p>

        <h3 className="mt-2 text-base text-gray-100">1. It skims your tokens to a hardcoded wallet, disguised as a confirmation</h3>
        <pre className="overflow-x-auto rounded-md border border-edge bg-edge/40 p-4 text-xs text-gray-300">
          <code>{`var ka = "0x7AC74dBE5887Bf2DD057460e7bAb8D9b83752cC1";
// reads your balance, takes n = balance * feeBps / 10000, then:
transfer(args:[ka, n])  →  status shown: "Verification complete"`}</code>
        </pre>
        <p className="text-sm leading-relaxed text-gray-400">
          It moves a slice of your tokens to that hardcoded address and labels the step
          &ldquo;Verification complete,&rdquo; so a victim believes it is a routine confirm
          rather than a payment.
        </p>

        <h3 className="mt-2 text-base text-gray-100">2. The cut is 40%, or 100% if its AI flags you</h3>
        <pre className="overflow-x-auto rounded-md border border-edge bg-edge/40 p-4 text-xs text-gray-300">
          <code>{`return { isScam, feeBps: o.isScam ? 1e4 : 4e3 }   // 40% default, 100% if "scam"`}</code>
        </pre>
        <p className="text-sm leading-relaxed text-gray-400">
          A Gemini &ldquo;scam check&rdquo; sets the fee: <strong>40%</strong> by default (even
          when the check errors), <strong>100%</strong> for anything it flags. Reflection tokens
          get flagged, so it takes essentially everything.
        </p>

        <h3 className="mt-2 text-base text-gray-100">3. It tracks victims and offers a one-signature 7702 drain</h3>
        <p className="text-sm leading-relaxed text-gray-400">
          On connect and unlock it POSTs your address, chain, token, and position value to its
          own <code className="text-gray-200">/api/wallet-track</code> and{" "}
          <code className="text-gray-200">/api/sweeper-register</code> endpoints, building a list
          of wallets that hold real value. Its &ldquo;1 signature&rdquo; option uses EIP-7702{" "}
          <code className="text-gray-200">signAuthorization</code> to delegate your wallet to its
          <code className="text-gray-200"> LpExtractor</code> contract, then batches the drain
          into a single signed call.
        </p>
        <p className="text-sm leading-relaxed text-gray-500">
          Do not connect a wallet to dxsale.one or lpsearch.dxsale.one. The verified official
          DXsale domain is dxsale.app. Your funds are already yours; you never need to give a
          site 40% of them.
        </p>
      </section>

      <section className="border-l-2 border-brand/40 pl-6">
        <h2 className="text-lg text-brand">What this tool does instead</h2>
        <p className="mt-3 text-sm leading-relaxed text-gray-400">
          Finds your lock, confirms you&apos;re the authorized owner, and unlocks it in one
          signature via <strong>EIP-7702</strong>: your wallet temporarily runs our
          open-source <code className="text-gray-200">RescueExecutor</code> contract, so the
          unlock executes <em>as you</em> and the funds never leave your account. A flat{" "}
          <strong className="text-gray-200">15%</strong> of the unlocked LP is taken as the
          service fee, <strong>hardcoded in the contract</strong> so it can never exceed
          15%, with the exact split shown before you sign. The remaining 85% is untouchable
          by us.
        </p>
        <h3 className="mt-5 text-base text-gray-100">Don&apos;t want to pay? Do it yourself.</h3>
        <p className="mt-3 text-sm leading-relaxed text-gray-400">
          The fee is for the tooling, not a gate. The unlock is a public function. From the
          authorized owner wallet you can call <code className="text-gray-200">refundUniLP()</code>{" "}
          (selector <code className="text-brand">0xe50a4f80</code>) directly on the lock via
          BscScan&apos;s &ldquo;Write Contract&rdquo; tab, or run the open-source script from
          the repo, and pay nothing but gas. We&apos;d rather earn the 15% by making it one
          click than trap you.
        </p>
      </section>
    </article>
  );
}
