import Link from "next/link";
import { RESCUE_EXECUTOR, FEE_BPS, REFERRAL_SHARE_BPS } from "@/lib/clientConfig";

// Everything here is independently verifiable. The contract is the source of
// truth; these are claims a user can check on-chain before signing anything.
const SCAN = RESCUE_EXECUTOR
  ? `https://bscscan.com/address/${RESCUE_EXECUTOR}#code`
  : null;

function Check() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="mt-0.5 shrink-0 text-brand">
      <path d="M3.5 8.5l3 3 6-6.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function TrustPanel() {
  const facts: { title: string; body: React.ReactNode }[] = [
    {
      title: "Open source, verified on-chain",
      body: SCAN ? (
        <>
          Read every line of the contract on{" "}
          <a href={SCAN} target="_blank" rel="noreferrer" className="text-brand hover:underline">BscScan (verified source)</a>.
          Address <code className="text-gray-300">{RESCUE_EXECUTOR}</code>.
        </>
      ) : (
        <>The <code className="text-gray-300">RescueExecutor</code> source is public; the verified BscScan link appears here once it&apos;s deployed.</>
      ),
    },
    {
      title: "The fee is hardcoded and capped",
      body: <>
        <code className="text-gray-300">FEE_BPS = {FEE_BPS}</code> ({FEE_BPS / 100}%) is a Solidity{" "}
        <code className="text-gray-300">constant</code>. It cannot be changed or exceeded by anyone, including us.
        Referral share is a fixed {REFERRAL_SHARE_BPS / 100}% of that fee.
      </>,
    },
    {
      title: "Only your wallet can trigger it",
      body: <>The contract requires <code className="text-gray-300">msg.sender == address(this)</code>, so only your own
        signed transaction can run it. No one else can act on your delegated account.</>,
    },
    {
      title: "Non-custodial: funds never leave your wallet",
      body: <>Via EIP-7702 the unlock executes <em>as your own account</em>. The 85% never moves anywhere.
        We can only transfer the hardcoded 15% fee, nothing else, in the same atomic transaction.</>,
    },
    {
      title: "You see the exact split before you sign",
      body: <>The breakdown (you keep 85%, fee 15%) is shown above before any signature. No hidden &ldquo;verification&rdquo; step.</>,
    },
    {
      title: "You never have to pay us at all",
      body: <>The unlock is a public function (<code className="text-gray-300">refundUniLP()</code>). You can call it
        yourself from your owner wallet for the cost of gas, no fee.{" "}
        <Link href="/how-it-works" className="text-gray-300 underline">Here&apos;s how</Link>. The 15% is for the one-click convenience, not a gate.</>,
    },
  ];

  return (
    <section className="panel mt-4 p-5">
      <h3 className="font-semibold text-gray-100">Don&apos;t trust us, verify us</h3>
      <p className="mt-1 text-xs leading-relaxed text-gray-500">
        Recovery scams hide what they do. Here is everything this contract can and cannot do, all checkable on-chain.
      </p>
      <ul className="mt-4 flex flex-col gap-3">
        {facts.map((f) => (
          <li key={f.title} className="flex gap-2.5">
            <Check />
            <div className="text-sm leading-relaxed">
              <span className="text-gray-200">{f.title}.</span>{" "}
              <span className="text-gray-400">{f.body}</span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
