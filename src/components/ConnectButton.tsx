"use client";

import { useEffect, useState } from "react";

const BSC_HEX = "0x38"; // chainId 56

// Lightweight wallet connect using window.ethereum (no extra deps). Reflects the
// wallet's actual connected account, so it stays in sync with the recover page.
export function ConnectButton() {
  const [account, setAccount] = useState<string | null>(null);

  useEffect(() => {
    const eth = (window as any).ethereum;
    if (!eth) return;
    // Passive only: reflect an existing connection WITHOUT any request, so the
    // wallet is never prompted on page load. We only call eth_requestAccounts
    // when the user clicks Connect. selectedAddress is synchronous (no popup).
    if (eth.selectedAddress) setAccount(eth.selectedAddress);
    const onAccounts = (a: string[]) => setAccount(a?.[0] ?? null);
    eth.on?.("accountsChanged", onAccounts);
    return () => eth.removeListener?.("accountsChanged", onAccounts);
  }, []);

  async function connect() {
    const eth = (window as any).ethereum;
    if (!eth) { window.open("https://metamask.io/download/", "_blank", "noopener"); return; }
    try {
      const accs = await eth.request({ method: "eth_requestAccounts" });
      setAccount(accs?.[0] ?? null);
      try {
        await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: BSC_HEX }] });
      } catch { /* user can switch manually; recovery checks the chain */ }
    } catch { /* user rejected */ }
  }

  const short = account ? `${account.slice(0, 6)}…${account.slice(-4)}` : null;

  return (
    <button
      onClick={connect}
      className="inline-flex items-center gap-2 rounded-md border border-edge px-3 py-1.5 text-sm transition hover:border-gray-600"
      title={account ? "Wallet connected" : "Connect a BNB Smart Chain wallet"}
    >
      {short ? (
        <>
          <span className="h-1.5 w-1.5 rounded-full bg-brand" />
          <span className="font-mono text-xs text-gray-200">{short}</span>
        </>
      ) : (
        <span className="text-gray-200">Connect wallet</span>
      )}
    </button>
  );
}
