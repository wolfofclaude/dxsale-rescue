// Read-only DXsale lock analysis. No private keys, no transactions.
// Used by API routes (server) and reusable for a single-lock lookup.

import { ethers } from "ethers";
import {
  RPC_URL, BNB_USD, REFERENCE_LOCK, REFUND_SELECTOR, WBNB, STABLES,
  PAIR_ABI, FACTORY_ABI, type LockReport,
} from "./chain";
import { getBnbUsd } from "./price";

export function getProvider() {
  return new ethers.JsonRpcProvider(RPC_URL);
}

function slotToAddress(word: string): string | null {
  if (!word || word === "0x" + "0".repeat(64)) return null;
  if (word.slice(2, 26) !== "0".repeat(24)) return null; // upper bytes must be clean
  const addr = "0x" + word.slice(-40);
  if (!/^0x[0-9a-fA-F]{40}$/.test(addr)) return null;
  const checksummed = ethers.getAddress(addr);
  return checksummed === ethers.ZeroAddress ? null : checksummed;
}

export function estimateUsd(
  t0: string, t1: string,
  reserves: readonly [bigint, bigint, number] | any,
  supply: bigint, held: bigint,
  bnbUsd: number = BNB_USD,
): number | null {
  if (supply === 0n) return null;
  const a = t0.toLowerCase(), b = t1.toLowerCase();
  const r0 = BigInt(reserves[0]), r1 = BigInt(reserves[1]);
  let sideReserve: bigint | null = null, mult = 1;
  if (a === WBNB) { sideReserve = r0; mult = bnbUsd; }
  else if (b === WBNB) { sideReserve = r1; mult = bnbUsd; }
  else if (STABLES[a]) { sideReserve = r0; mult = STABLES[a]; }
  else if (STABLES[b]) { sideReserve = r1; mult = STABLES[b]; }
  if (sideReserve === null) return null;
  const underlying = (sideReserve * held) / supply;
  const sideUsd = Number(ethers.formatEther(underlying)) * mult;
  return Math.round(sideUsd * 2); // LP ~= 2x the priced side
}

let cachedRefHash: string | null = null;
export async function referenceHash(provider: ethers.JsonRpcProvider) {
  if (cachedRefHash) return cachedRefHash;
  const code = await provider.getCode(REFERENCE_LOCK);
  if (code === "0x") throw new Error("Reference lock has no code — check RPC.");
  cachedRefHash = ethers.keccak256(code);
  return cachedRefHash;
}

export async function analyzeLock(
  provider: ethers.JsonRpcProvider,
  address: string,
  refHash: string,
  bnbUsd: number = BNB_USD,
): Promise<LockReport> {
  const row: LockReport = { address, status: "skip" };
  try {
    const code = await provider.getCode(address);
    if (code === "0x") { row.status = "skip"; row.note = "no code"; return row; }

    row.codeMatch = ethers.keccak256(code) === refHash;
    const hasRefund = code.toLowerCase().includes(REFUND_SELECTOR);

    if (!row.codeMatch) {
      row.status = hasRefund ? "review" : "skip";
      row.note = hasRefund
        ? "has refundUniLP but a different bytecode — verify layout manually"
        : "not a matching lock template";
      return row;
    }

    // DXsale lock layout (verified): slot2 = project token, slot3 = authorized
    // caller, slot4 = unlock timestamp, slot6 = the DEX factory. The LP pair
    // address is NOT stored — it must be COMPUTED via factory.getPair(token, base).
    const [s2, s3, s4, s6] = await Promise.all([
      provider.getStorage(address, 2),
      provider.getStorage(address, 3),
      provider.getStorage(address, 4),
      provider.getStorage(address, 6),
    ]);
    row.authorizedCaller = slotToAddress(s3); // needed at recovery time
    const unlockTime = BigInt(s4);
    row.unlockTime = new Date(Number(unlockTime) * 1000).toISOString();

    const token = slotToAddress(s2);
    const factory = slotToAddress(s6);
    if (token) row.tokenAddress = token;
    if (token && factory) {
      const fac = new ethers.Contract(factory, FACTORY_ABI, provider);
      for (const base of [WBNB, ...Object.keys(STABLES)]) {
        let pairAddr: string;
        try { pairAddr = await fac.getPair(token, base); } catch { continue; }
        if (!pairAddr || pairAddr === ethers.ZeroAddress) continue;
        try {
          const pair = new ethers.Contract(pairAddr, PAIR_ABI, provider);
          const held: bigint = await pair.balanceOf(address);
          if (held === 0n) continue;
          const [t0, t1, reserves, supply] = await Promise.all([
            pair.token0(), pair.token1(), pair.getReserves(), pair.totalSupply(),
          ]);
          row.lpToken = pairAddr;
          row.lpHeld = ethers.formatUnits(held, 18);
          row.estUsd = estimateUsd(t0, t1, reserves, supply, held, bnbUsd);
          break;
        } catch { continue; }
      }
    }

    const now = BigInt(Math.floor(Date.now() / 1000));
    const funded = !!row.lpHeld && Number(row.lpHeld) > 0;
    if (!funded) { row.status = "empty"; row.note = "no LP held (withdrawn or never funded)"; }
    else if (now <= unlockTime) { row.status = "locked"; row.note = "still in lock period"; }
    else { row.status = "RECOVERABLE"; }
    return row;
  } catch (e: any) {
    row.status = "error";
    row.note = e?.shortMessage || e?.message || "unknown error";
    return row;
  }
}

// Discover candidate lock addresses created by a factory/deployer.
export async function discoverCandidates(): Promise<string[]> {
  const apiKey = process.env.ETHERSCAN_API_KEY || "";
  const factory = (process.env.FACTORY || "").toLowerCase();
  const base = process.env.API_BASE || "https://api.etherscan.io/v2/api?chainid=56";
  if (!apiKey || !factory) {
    throw new Error("Set ETHERSCAN_API_KEY and FACTORY in env to discover.");
  }
  const url = `${base}&module=account&action=txlist&address=${factory}` +
              `&startblock=0&endblock=99999999&sort=asc&apikey=${apiKey}`;
  const res = await fetch(url, { next: { revalidate: 3600 } } as any);
  const json: any = await res.json();
  const created: string[] = (json.result || [])
    .filter((t: any) => (t.to === "" || t.to === null) && t.contractAddress)
    .map((t: any) => ethers.getAddress(t.contractAddress));
  return Array.from(new Set(created));
}

export async function analyzeMany(addresses: string[]): Promise<LockReport[]> {
  const provider = getProvider();
  const refHash = await referenceHash(provider);
  const bnbUsd = await getBnbUsd(); // live CoinGecko price for accurate value
  const out: LockReport[] = [];
  for (let i = 0; i < addresses.length; i += 8) {
    const batch = addresses.slice(i, i + 8);
    out.push(...(await Promise.all(batch.map((a) => analyzeLock(provider, a, refHash, bnbUsd)))));
  }
  return out;
}
