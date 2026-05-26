"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ethers } from "ethers";
import type { LockReport } from "@/lib/chain";
import { LOCK_ABI } from "@/lib/chain";
import { StatusTag } from "@/components/StatusTag";
import { TipPanel } from "@/components/TipPanel";

const BSC_CHAIN_ID = 56n;

function RecoverInner() {
  const lock = useSearchParams().get("lock") || "";
  const [report, setReport] = useState<LockReport | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [chainOk, setChainOk] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [recovered, setRecovered] = useState(false);

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
      setChainOk(net.chainId === BSC_CHAIN_ID);
      if (net.chainId !== BSC_CHAIN_ID) {
        try {
          await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: "0x38" }] });
          setChainOk(true);
        } catch { setMsg("Please switch your wallet to BNB Smart Chain (chainId 56)."); }
      }
    } catch (e: any) { setMsg(e?.message || "Wallet connection failed."); }
  }

  const isOwner =
    !!account && !!report?.authorizedCaller &&
    account.toLowerCase() === report.authorizedCaller.toLowerCase();

  async function recover() {
    setBusy(true); setMsg(null);
    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(lock, LOCK_ABI, signer);
      // Simulate first — abort cleanly if it would revert.
      await contract.refundUniLP.staticCall();
      const tx = await contract.refundUniLP();
      setTxHash(tx.hash);
      await tx.wait();
      setRecovered(true);
      setMsg("Unlocked. Your LP is back in your wallet — remove liquidity on PancakeSwap to redeem.");
    } catch (e: any) {
      setMsg(e?.shortMessage || e?.message || "Transaction failed.");
    } finally { setBusy(false); }
  }

  if (!lock) return <p className="text-gray-400">No lock specified. Start from <a className="text-brand underline" href="/">Find my lock</a>.</p>;

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-2xl font-bold text-gray-50">Recover your LP</h1>
      <p className="mt-1 text-sm text-gray-400">
        You will sign the unlock in your own wallet. This site never sees your keys
        and takes <strong className="text-brand">0%</strong>.
      </p>

      <div className="panel mt-6 p-5">
        <div className="flex items-center justify-between">
          <code className="text-xs text-gray-400 break-all">{lock}</code>
          {report && <StatusTag status={report.status} />}
        </div>
        {report && (
          <dl className="mt-3 grid grid-cols-2 gap-y-1 text-sm">
            {report.estUsd != null && (<><dt className="text-gray-500">Est. value</dt>
              <dd className="text-right font-mono text-brand">${report.estUsd.toLocaleString()}</dd></>)}
            {report.unlockTime && (<><dt className="text-gray-500">Unlocked since</dt>
              <dd className="text-right font-mono">{report.unlockTime.slice(0, 10)}</dd></>)}
            {report.authorizedCaller && (<><dt className="text-gray-500">Authorized wallet</dt>
              <dd className="text-right font-mono text-xs break-all">{report.authorizedCaller}</dd></>)}
          </dl>
        )}
      </div>

      <div className="panel mt-4 p-5">
        {!account ? (
          <button onClick={connect} className="btn-brand w-full">Connect wallet</button>
        ) : (
          <>
            <p className="text-sm text-gray-400">Connected: <code className="text-gray-200">{account}</code></p>
            {!chainOk && <p className="mt-2 text-sm text-warn">Switch to BNB Smart Chain to continue.</p>}
            {chainOk && !isOwner && (
              <p className="mt-2 text-sm text-danger">
                This wallet is not the authorized unlocker for this lock. Connect the
                original launch/owner wallet shown above.
              </p>
            )}
            {chainOk && isOwner && report?.status === "RECOVERABLE" && (
              <button onClick={recover} disabled={busy} className="btn-brand mt-3 w-full">
                {busy ? "Confirm in wallet…" : "Sign refundUniLP() and recover"}
              </button>
            )}
          </>
        )}
        {txHash && (
          <a className="mt-3 block text-sm text-brand underline" target="_blank" rel="noreferrer"
             href={`https://bscscan.com/tx/${txHash}`}>View transaction →</a>
        )}
        {msg && <p className="mt-3 text-sm text-gray-300">{msg}</p>}
      </div>

      {recovered && <TipPanel estUsd={report?.estUsd} />}
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
