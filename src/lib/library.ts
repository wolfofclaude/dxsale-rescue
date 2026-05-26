// The open lock library: a registry of known DXsale lock addresses, enriched
// with live on-chain status at read time. The registry holds addresses only;
// nothing about value/ownership is baked in — it's all computed fresh.

import registry from "@/data/locks.json";
import { analyzeMany } from "./scanner";
import type { LockReport } from "./chain";

export interface RegistryEntry {
  address: string;
  token?: string;
  version?: string;
  source?: string;
}

export function registryEntries(): RegistryEntry[] {
  return (registry.locks as RegistryEntry[]) ?? [];
}

export function registryMeta() {
  return { chain: registry.chain, updated: registry.updated, count: registryEntries().length };
}

export interface LibraryRow extends LockReport {
  token?: string;
  version?: string;
}

export async function enrichLibrary(): Promise<LibraryRow[]> {
  const entries = registryEntries();
  const reports = await analyzeMany(entries.map((e) => e.address));
  const byAddr = new Map(reports.map((r) => [r.address.toLowerCase(), r]));
  return entries.map((e) => {
    const r = byAddr.get(e.address.toLowerCase());
    return { ...(r as LockReport), token: e.token, version: e.version };
  });
}
