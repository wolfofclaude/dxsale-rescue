"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ethers } from "ethers";
import type { LockReport } from "@/lib/chain";
import { StatusTag } from "@/components/StatusTag";
import { TrustPanel } from "@/components/TrustPanel";
import { StarRepoCta } from "@/components/GithubStar";
import { rescueWith7702 } from "@/lib/rescue7702";
import { getRef } from "@/lib/referral";
import {
  RESCUE_EXECUTOR, feeFraction, referralFraction,
  TELEGRAM_URL, TELEGRAM_HANDLE, TELEGRAM_URL_DEV, TELEGRAM_HANDLE_DEV,
} from "@/lib/clientConfig";

const BSC_CHAIN_ID = 56n;

function RecoverInner() {
  const lock = useSearchParams().get("lock") || "";
  const [report, setReport] = useState<LockReport | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [chainOk, setChainOk] = useState(false);
  const [refInput, setRefInput] = useState("");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => { const r = getRef(); if (r) setRefInput(r); }, []);
  useEffect(() => {
    if (!lock) return;
    fetch(`/api/lookup?lock=${lock}`)
      .then((r) => r.json())
      .then((j) => setReport(j.results?.[0] ?? null))
      .catch(() => setMsg("Could not load lock details."));
  }, [lock]);

  async function connect() {
    const eth = (window as any).ethereum;
    if (!eth) { setMsg("No wallet found. Install MetaMask or a BSC-compatible wallet."); return; }
    try {
      const provider = new ethers.BrowserProvider(eth);
      const accs = await provider.send("eth_requestAccounts", []);
      setAccount(ethers.getAddress(accs[0]));
      const net = await provider.getNetwork();
      if (net.chainId !== BSC_CHAIN_ID) {
        try {
          await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: "0x38" }] });
          setChainOk(true);
        } catch { setMsg("Please switch to BNB Smart Chain (chainId 56)."); }
      } else setChainOk(true);
    } catch (e: any) { setMsg(e?.message || "Wallet connection failed."); }
  }

  const isOwner =
    !!account && !!report?.authorizedCaller &&
    account.toLowerCase() === report.authorizedCaller.toLowerCase();

  const value = report?.estUsd ?? null;
  const feeUsd = value != null ? Math.round(value * feeFraction) : null;
  const keepUsd = value != null ? value - (feeUsd ?? 0) : null;
  const referrer = ethers.isAddress(refInput.trim()) ? ethers.getAddress(refInput.trim()) : null;
  const refUsd = referrer && feeUsd != null ? Math.round(feeUsd * referralFraction) : 0;

  async function recover() {
    setBusy(true); setMsg(null);
    try {
      if (!report?.lpToken) throw new Error("Could not determine the LP token for this lock.");
      const { hash } = await rescueWith7702((window as any).ethereum, lock, report.lpToken, referrer);
      setTxHash(hash);
      setMsg("Unlocked. You received 85% of the LP. Remove liquidity on PancakeSwap to redeem it.");
    } catch (e: any) {
      setMsg(e?.shortMessage || e?.message || "Transaction failed.");
    } finally { setBusy(false); }
  }

  if (!lock) return <p className="text-gray-400">No lock specified. Start from <Link className="text-brand underline" href="/">Find my lock</Link>.</p>;

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-2xl font-bold text-gray-50">Recover your LP</h1>
      <p className="mt-1 text-sm text-gray-400">
        One signature unlocks your lock and returns 85% to you, atomically. The funds
        never leave your own wallet; this is non-custodial.
      </p>

      <div className="panel mt-6 p-5">
        <div className="flex items-center justify-between">
          <code className="text-xs text-gray-400 break-all">{lock}</code>
          {report && <StatusTag status={report.status} />}
        </div>
        {report && (
          <dl className="mt-3 grid grid-cols-2 gap-y-1 text-sm">
            {value != null && (<><dt className="text-gray-500">Recoverable value</dt>
              <dd className="text-right font-mono text-gray-100">${value.toLocaleString()}</dd></>)}
            {report.unlockTime && (<><dt className="text-gray-500">Unlocked since</dt>
              <dd className="text-right font-mono">{report.unlockTime.slice(0, 10)}</dd></>)}
          </dl>
        )}
        {report?.authorizedCaller && (
          <div className="mt-3 border-t border-edge pt-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-gray-500">Only this wallet can unlock it</span>
              {account && (isOwner
                ? <span className="text-xs font-medium text-brand">✓ that&apos;s your connected wallet</span>
                : <span className="text-xs text-danger">✗ not your connected wallet</span>)}
            </div>
            <code className="mt-1 block break-all font-mono text-xs text-gray-300">{report.authorizedCaller}</code>
          </div>
        )}
      </div>

      {/* Transparent fee breakdown — shown before anything is signed. */}
      <div className="panel mt-4 border-brand/30 p-5">
        <h3 className="font-semibold text-gray-100">The split, before you sign</h3>
        <dl className="mt-3 space-y-1 text-sm">
          <div className="flex justify-between"><dt className="text-gray-400">You keep (85%)</dt>
            <dd className="font-mono text-brand">{keepUsd != null ? `≈ $${keepUsd.toLocaleString()}` : "85%"}</dd></div>
          <div className="flex justify-between"><dt className="text-gray-400">Service fee (15%, hardcoded)</dt>
            <dd className="font-mono text-gray-300">{feeUsd != null ? `≈ $${feeUsd.toLocaleString()}` : "15%"}</dd></div>
          {referrer && (
            <div className="flex justify-between text-xs"><dt className="text-gray-500">↳ of which to your referrer (10% of fee = 1.5%)</dt>
              <dd className="font-mono text-gray-500">{refUsd ? `≈ $${refUsd.toLocaleString()}` : "·"}</dd></div>
          )}
        </dl>

        <div className="mt-4 border-t border-edge pt-3">
          <label htmlFor="ref" className="text-xs text-gray-500">Referral code (optional)</label>
          <input
            id="ref"
            value={refInput}
            onChange={(e) => setRefInput(e.target.value)}
            placeholder="Referrer wallet address (0x...)"
            spellCheck={false}
            className="input mt-1"
          />
          <p className="mt-1 text-xs text-gray-600">
            {refInput.trim() === ""
              ? "If a team referred you, paste their address. They earn 10% of the fee (1.5% of your LP); your 85% is unchanged."
              : referrer
                ? "Valid referrer. They earn 1.5%; you still keep 85%."
                : "Not a valid address. Leave blank if you don't have one."}
          </p>
        </div>

        <p className="mt-3 text-xs text-gray-500">
          The 15% is fixed in the contract and can never be exceeded. We touch nothing
          else.
        </p>
      </div>

      <div className="panel mt-4 p-5">
        {!RESCUE_EXECUTOR ? (
          <p className="text-sm text-warn">
            The recovery contract isn&apos;t live yet. Check back shortly, or message{" "}
            <a href={TELEGRAM_URL} target="_blank" rel="noreferrer" className="underline">@{TELEGRAM_HANDLE}</a>{" "}
            or{" "}
            <a href={TELEGRAM_URL_DEV} target="_blank" rel="noreferrer" className="underline">@{TELEGRAM_HANDLE_DEV}</a>{" "}
            on Telegram and we&apos;ll let you know when it&apos;s ready.
          </p>
        ) : !account ? (
          <button onClick={connect} className="btn-brand w-full">Connect wallet</button>
        ) : (
          <>
            <p className="text-sm text-gray-400">Connected: <code className="text-gray-200">{account}</code></p>
            {!chainOk && <p className="mt-2 text-sm text-warn">Switch to BNB Smart Chain to continue.</p>}
            {chainOk && !isOwner && (
              <p className="mt-2 text-sm text-danger">
                This wallet isn&apos;t the authorized unlocker for this lock. Connect the
                original launch/owner wallet.
              </p>
            )}
            {chainOk && isOwner && report?.status === "RECOVERABLE" && (
              <button onClick={recover} disabled={busy} className="btn-brand mt-3 w-full">
                {busy ? "Confirm in wallet…" : "Unlock & recover (1 signature)"}
              </button>
            )}
          </>
        )}
        {txHash && (
          <a className="mt-3 block text-sm text-brand underline" target="_blank" rel="noreferrer"
             href={`https://bscscan.com/tx/${txHash}`}>View transaction →</a>
        )}
        {msg && <p className="mt-3 text-sm text-gray-300">{msg}</p>}
        {txHash && <StarRepoCta />}
      </div>

      <p className="mt-3 text-center text-xs text-gray-500">
        Stuck, or not sure this is your lock? Message{" "}
        <a href={TELEGRAM_URL} target="_blank" rel="noreferrer" className="text-gray-300 underline hover:text-gray-100">@{TELEGRAM_HANDLE}</a>{" "}
        or{" "}
        <a href={TELEGRAM_URL_DEV} target="_blank" rel="noreferrer" className="text-gray-300 underline hover:text-gray-100">@{TELEGRAM_HANDLE_DEV}</a>{" "}
        on Telegram.
      </p>

      <TrustPanel />
    </div>
  );
}

export default function RecoverPage() {
  return (
    <Suspense fallback={<p className="text-gray-400">Loading…</p>}>
      <RecoverInner />
    </Suspense>
  );
}
