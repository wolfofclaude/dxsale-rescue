// The open lock library. Entries are PRE-COMPUTED by scripts/index-locks.mjs.
// We read locks.json FRESH from disk on each call (not a static import) so the
// site reflects the file live as the indexer fills it. Falls back to the
// bundled copy if the file can't be read (e.g. mid-write or on Vercel).

import fs from "fs";
import path from "path";
import seed from "@/data/locks.json";
import type { LockStatus } from "./chain";

export interface LibraryEntry {
  address: string;
  token?: string;        // symbol
  tokenAddress?: string; // project token contract
  version?: string;
  status: LockStatus;
  estUsd?: number | null;
  unlockTime?: string | null;
  lpToken?: string | null;
  ownerLastActive?: string | null; // ISO: owner wallet's last signed tx
  ownerDaysIdle?: number | null;   // days since that tx (null = not measured)
}

interface Registry {
  chain?: string; updated?: string; factory?: string; bnbUsd?: number; locks: LibraryEntry[];
}

let lastGood: Registry = seed as unknown as Registry;

function loadRegistry(): Registry {
  try {
    const p = path.join(process.cwd(), "src", "data", "locks.json");
    const parsed = JSON.parse(fs.readFileSync(p, "utf8")) as Registry;
    if (Array.isArray(parsed.locks)) lastGood = parsed;
    return lastGood;
  } catch {
    return lastGood; // file missing or caught mid-write — serve last good copy
  }
}

export function libraryRows(): LibraryEntry[] {
  return loadRegistry().locks ?? [];
}

export function registryMeta() {
  const r = loadRegistry();
  return {
    chain: r.chain, updated: r.updated, factory: r.factory,
    bnbUsd: r.bnbUsd ?? 600, // BNB price used when values were computed
    count: (r.locks ?? []).length,
  };
}

export function sortedRows(filter?: "recoverable"): LibraryEntry[] {
  const rows = [...libraryRows()];
  rows.sort((a, b) => {
    const score = (r: LibraryEntry) =>
      r.status === "RECOVERABLE" ? 1e15 + (r.estUsd ?? 0) : r.estUsd ?? 0;
    return score(b) - score(a);
  });
  return filter === "recoverable" ? rows.filter((r) => r.status === "RECOVERABLE") : rows;
}

export function aggregateStats() {
  const rows = libraryRows();
  const tally: Record<string, number> = {};
  let recoverableUsd = 0, lockedUsd = 0;
  for (const r of rows) {
    tally[r.status] = (tally[r.status] || 0) + 1;
    if (r.status === "RECOVERABLE") recoverableUsd += r.estUsd ?? 0;
    else if (r.status === "locked") lockedUsd += r.estUsd ?? 0;
  }
  return {
    indexed: rows.length,
    recoverable: tally["RECOVERABLE"] || 0,
    recoverableUsd,
    stillLocked: tally["locked"] || 0,
    lockedUsd,
    tvlUsd: recoverableUsd + lockedUsd, // total value locked across the library
    emptyOrWithdrawn: (tally["empty"] || 0) + (tally["withdrawn-flag"] || 0),
    needsReview: tally["review"] || 0,
  };
}
