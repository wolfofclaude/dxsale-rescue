// Backfill token contract address (+ symbol) into an existing locks.json,
// without re-running the full indexer. Reads slot 2 (project token) of each
// real lock and, if missing, its symbol. Read-only, fast, resumable.
//
//   node scripts/add-token-info.mjs --rpc=<BSC_RPC>

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ethers } from "ethers";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REGISTRY = path.join(__dirname, "..", "src", "data", "locks.json");

const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const [k, v] = a.replace(/^--/, "").split("="); return [k, v ?? true];
}));
const RPC = args.rpc || process.env.RPC_URL || "https://bsc-dataseed.binance.org/";
const CONC = Number(args.conc || 16);
const provider = new ethers.JsonRpcProvider(RPC, undefined, { batchMaxCount: 1 });
const SYMBOL_ABI = ["function symbol() view returns (string)"];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function slotToAddress(word) {
  if (!word || word.slice(2, 26) !== "0".repeat(24)) return null;
  const a = "0x" + word.slice(-40);
  return /^0x[0-9a-fA-F]{40}$/.test(a) && a !== ethers.ZeroAddress.toLowerCase() ? ethers.getAddress(a) : null;
}

async function enrich(lock) {
  try {
    if (!lock.tokenAddress) {
      const t = slotToAddress(await provider.getStorage(lock.address, 2));
      if (t) lock.tokenAddress = t.toLowerCase();
    }
    if (lock.tokenAddress && !lock.token) {
      try { lock.token = await new ethers.Contract(lock.tokenAddress, SYMBOL_ABI, provider).symbol(); } catch {}
    }
  } catch { /* leave as-is */ }
  return lock;
}

(async () => {
  const reg = JSON.parse(fs.readFileSync(REGISTRY, "utf8"));
  // Only real locks need a token address; "skip" entries are non-locks.
  const todo = reg.locks.filter((l) => l.status !== "skip" && !l.tokenAddress);
  console.log(`Enriching ${todo.length} locks with token contract address + symbol ...`);
  let done = 0;
  for (let i = 0; i < todo.length; i += CONC) {
    await Promise.all(todo.slice(i, i + CONC).map(enrich));
    done += Math.min(CONC, todo.length - i);
    process.stdout.write(`\r  ${done}/${todo.length}   `);
    if (done % 400 < CONC) { reg.updated = new Date().toISOString().slice(0, 10); fs.writeFileSync(REGISTRY, JSON.stringify(reg, null, 2) + "\n"); }
    await sleep(30);
  }
  reg.updated = new Date().toISOString().slice(0, 10);
  fs.writeFileSync(REGISTRY, JSON.stringify(reg, null, 2) + "\n");
  process.stdout.write("\n");
  const withAddr = reg.locks.filter((l) => l.tokenAddress).length;
  console.log(`Done. ${withAddr} locks now have a token address.`);
})().catch((e) => { console.error("\nError:", e.message); process.exit(1); });
