"use client";

import { useState } from "react";
import { TIP_ADDRESS } from "@/lib/clientConfig";

// Optional tip jar. The address is a plain public receive address (BSC/EVM).
export function TipPanel() {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(TIP_ADDRESS);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard blocked; address is visible to copy manually */ }
  }

  return (
    <section className="flex flex-col gap-2 rounded-md border border-edge bg-panel p-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h3 className="text-sm font-semibold text-gray-100">Found this useful? Tip the dev.</h3>
        <p className="mt-0.5 text-xs text-gray-500">Optional, never required. BNB / any EVM token on BNB Smart Chain.</p>
      </div>
      <button
        onClick={copy}
        title="Copy tip address"
        className="inline-flex items-center gap-2 self-start rounded-md border border-edge bg-ink px-3 py-2 font-mono text-xs text-gray-200 transition hover:border-gray-600 sm:self-auto"
      >
        <span className="break-all">{TIP_ADDRESS}</span>
        <span className={copied ? "text-brand" : "text-gray-500"}>{copied ? "copied" : "copy"}</span>
      </button>
    </section>
  );
}
