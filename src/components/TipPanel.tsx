"use client";

import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { getRef } from "@/lib/referral";
import {
  TIP_ADDRESS, BNB_USD_CLIENT, tipFraction, referralFraction,
} from "@/lib/clientConfig";

// Shown only after a successful, non-custodial recovery. The recovery itself
// was free; this is a genuinely optional thank-you. If a referrer is on file,
// we split the tip on-chain (referrer + tool) and say so plainly.
export function TipPanel({ estUsd }: { estUsd?: number | null }) {
  const [ref, setRef] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => { setRef(getRef()); }, []);

  // Suggested tip = configured % of recovered value, converted to BNB.
  useEffect(() => {
    if (estUsd && BNB_USD_CLIENT > 0) {
      setAmount(((estUsd * tipFraction) / BNB_USD_CLIENT).toFixed(4));
    }
  }, [estUsd]);

  if (!TIP_ADDRESS) return null; // tipping not configured

  const total = Number(amount) || 0;
  const refCut = ref ? total * referralFraction : 0;
  const toolCut = total - refCut;

  async function sendTip() {
    setBusy(true); setErr(null);
    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      // If a referrer is on file, pay their share first, then the rest to the tool.
      if (ref && refCut > 0) {
        const t1 = await signer.sendTransaction({
          to: ref, value: ethers.parseEther(refCut.toFixed(18)),
        });
        await t1.wait();
      }
      const t2 = await signer.sendTransaction({
        to: TIP_ADDRESS, value: ethers.parseEther(toolCut.toFixed(18)),
      });
      setDone(t2.hash);
    } catch (e: any) {
      setErr(e?.shortMessage || e?.message || "Tip cancelled.");
    } finally { setBusy(false); }
  }

  if (done) {
    return (
      <div className="panel mt-4 border-brand/40 p-5">
        <p className="text-sm text-brand">Thank you — that keeps this free for the next person.</p>
        <a className="mt-2 block text-sm text-brand underline" target="_blank" rel="noreferrer"
           href={`https://bscscan.com/tx/${done}`}>View tip transaction →</a>
      </div>
    );
  }

  return (
    <div className="panel mt-4 p-5">
      <h3 className="font-semibold text-gray-100">Optional: tip {Math.round(tipFraction * 100)}%</h3>
      <p className="mt-1 text-sm text-gray-400">
        Your recovery was free and you kept 100% — no fee was taken. If it helped, a tip
        keeps the tool running for the next owner. Entirely optional.
      </p>

      <div className="mt-3 flex gap-2">
        <input
          className="input" inputMode="decimal"
          value={amount} onChange={(e) => setAmount(e.target.value)}
          placeholder="Tip amount (BNB)"
        />
        <button onClick={sendTip} disabled={busy || total <= 0} className="btn-brand whitespace-nowrap">
          {busy ? "Confirm…" : "Send tip"}
        </button>
      </div>

      {ref && total > 0 && (
        <p className="mt-3 rounded-lg border border-edge bg-ink p-3 text-xs text-gray-400">
          A referral is on file. Of this tip,{" "}
          <span className="text-gray-200">{refCut.toFixed(4)} BNB ({Math.round(referralFraction * 100)}%)</span>{" "}
          goes to whoever referred you (<code className="break-all">{ref}</code>), and the
          rest ({toolCut.toFixed(4)} BNB) supports the tool. Paid as two transparent transfers
          you approve in your wallet.
        </p>
      )}
    </div>
  );
}
