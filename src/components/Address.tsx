"use client";

import { useState } from "react";

// Compact, copyable address with a BscScan link. Used for token + lock contracts.
export function Address({ value, kind = "address" }: { value: string; kind?: "address" | "token" }) {
  const [copied, setCopied] = useState(false);
  const short = `${value.slice(0, 6)}…${value.slice(-4)}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch { /* clipboard blocked */ }
  }

  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-xs">
      <a
        href={`https://bscscan.com/${kind}/${value}`}
        target="_blank" rel="noreferrer"
        className="text-gray-400 hover:text-brand transition"
        title={value}
      >{short}</a>
      <button
        onClick={copy}
        className="text-gray-600 hover:text-gray-300 transition"
        title="Copy address"
        aria-label="Copy address"
      >{copied ? "✓" : "⧉"}</button>
    </span>
  );
}
