// Discover + decode ALL DXsale locks created by the factory, and write the
// pre-computed library to src/data/locks.json.
//
//   node scripts/index-locks.mjs --key=<ETHERSCAN_API_KEY> [options]
//
// Options:
//   --key=KEY        Etherscan unified API key (chainid 56). Or env ETHERSCAN_API_KEY.
//   --factory=ADDR   DXsale factory (default: the verified DXsale presale factory).
//   --rpc=URL        BSC RPC (default: public; an archive node is strongly recommended).
//   --limit=N        Only analyze the first N discovered locks (for a quick pass).
//   --refresh        Re-decode locks already in the library (default: skip known).
//   --discover-only  Just collect addresses; don't decode yet.
//
// 100% read-only. No private key. Owner wallets are NOT written to the public index.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ethers } from "ethers";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REGISTRY = path.join(__dirname, "..", "src", "data", "locks.json");

// ---- args ----
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? true];
  }),
);
const KEY = args.key || process.env.ETHERSCAN_API_KEY || "";
const FACTORY = (args.factory || "0xc5fe280422117461af9b953da413e9627e3b9a40").toLowerCase();
const RPC = args.rpc || process.env.RPC_URL || "https://bsc-dataseed.binance.org/";
const API_BASE = process.env.API_BASE || "https://api.etherscan.io/v2/api?chainid=56";
const LIMIT = args.limit ? Number(args.limit) : Infinity;
let BNB_USD = Number(process.env.BNB_USD || "600"); // refreshed from CoinGecko at startup

async function fetchBnbUsd() {
  try {
    const j = await (await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=binancecoin&vs_currencies=usd")).json();
    const v = Number(j?.binancecoin?.usd);
    if (v > 0) return v;
  } catch {}
  return BNB_USD;
}

const REFERENCE_LOCK = "0x30594e7cc7787f5eb1397656c1588f64bddbfbf7";
const REFUND_SELECTOR = "e50a4f80";
const WBNB = "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c";
const STABLES = {
  "0xe9e7cea3dedca5984780bafc599bd69add087d56": 1,
  "0x55d398326f99059ff775485246999027b3197955": 1,
  "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d": 1,
};
const PAIR_ABI = [
  "function token0() view returns (address)",
  "function token1() view returns (address)",
  "function getReserves() view returns (uint112,uint112,uint32)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function symbol() view returns (string)",
];
const FACTORY_ABI = ["function getPair(address,address) view returns (address)"];
const SYMBOL_ABI = ["function symbol() view returns (string)"];

// batchMaxCount: 1 disables JSON-RPC batching — without it, ethers reports a
// failing call as the opaque "could not coalesce error" instead of the real reason.
const provider = new ethers.JsonRpcProvider(RPC, undefined, { batchMaxCount: 1 });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- discovery: every contract the factory CREATE'd, via trace_filter ----
// Works with just an RPC that supports trace_filter (e.g. Alchemy) — no explorer
// API needed. Walks history in block windows, paginating each with after/count.
const START_BLOCK = Number(args.start || 8155000); // ~factory's first activity (Jun 2021)
const STEP = Number(args.step || 200_000); // initial window; auto-shrinks on error
const BIG = 9_000; // if a window returns this many traces, split it (likely truncated)
let loggedError = false;

// Recursively scan [lo,hi]; on any RPC error or a too-dense window, split in half.
// This self-tunes to whatever block range / result cap the RPC allows.
async function scanRange(lo, hi, found) {
  let res;
  try {
    res = await provider.send("trace_filter", [{
      fromBlock: ethers.toQuantity(lo),
      toBlock: ethers.toQuantity(hi),
      fromAddress: [FACTORY],
    }]);
  } catch (e) {
    if (!loggedError) {
      loggedError = true;
      const detail = e.error?.message || e.info?.error?.message || e.shortMessage || e.message;
      process.stdout.write(`\n  (first trace_filter error, will auto-split): ${detail}\n`);
    }
    if (hi > lo) {
      const mid = Math.floor((lo + hi) / 2);
      await scanRange(lo, mid, found);
      await scanRange(mid + 1, hi, found);
    } else {
      process.stdout.write(`\n  giving up on single block ${lo}\n`);
    }
    return;
  }
  if (res.length >= BIG && hi > lo) { // window truncated — split for completeness
    const mid = Math.floor((lo + hi) / 2);
    await scanRange(lo, mid, found);
    await scanRange(mid + 1, hi, found);
    return;
  }
  for (const t of res) {
    if (t.type === "create" && t.result?.address) found.add(ethers.getAddress(t.result.address));
  }
}

async function discoverViaTrace() {
  const latest = await provider.getBlockNumber();
  const found = new Set();
  for (let lo = START_BLOCK; lo <= latest; lo += STEP) {
    const hi = Math.min(lo + STEP - 1, latest);
    await scanRange(lo, hi, found);
    process.stdout.write(`\r  scanned up to block ${hi}/${latest} — created so far ${found.size}   `);
    await sleep(50);
  }
  process.stdout.write("\n");
  return [...found];
}

// ---- discovery via Etherscan V2 API (fast: one call per 10k results) ----
// Enumerates every contract the factory created from its internal CREATE txs.
// Requires a reachable api.etherscan.io (run OUTSIDE the Claude sandbox) + a key.
async function discoverViaApi() {
  if (!KEY) throw new Error("API discovery needs a key: --key=... or ETHERSCAN_API_KEY.");
  const found = new Set();
  for (const action of ["txlistinternal", "txlist"]) {
    for (let page = 1; page <= 100; page++) {
      const url = `${API_BASE}&module=account&action=${action}&address=${FACTORY}` +
                  `&startblock=0&endblock=99999999&page=${page}&offset=10000&sort=asc&apikey=${KEY}`;
      let json;
      try { json = await (await fetch(url)).json(); }
      catch (e) { throw new Error(`fetch failed (is api.etherscan.io reachable here?): ${e.message}`); }
      if (json.message && /Invalid API Key|deprecated|NOTOK/i.test(json.message) && !Array.isArray(json.result)) {
        throw new Error(`Etherscan: ${json.message} — ${typeof json.result === "string" ? json.result : ""}`);
      }
      const rows = Array.isArray(json.result) ? json.result : [];
      for (const t of rows) {
        const created = t.contractAddress && t.contractAddress !== "" ? t.contractAddress : null;
        const isCreate = t.type === "create" || t.to === "" || t.to === null;
        if (isCreate && created) found.add(ethers.getAddress(created));
      }
      process.stdout.write(`\r  ${action}: page ${page} — created so far ${found.size}   `);
      if (rows.length < 10000) break;
      await sleep(220);
    }
    process.stdout.write("\n");
  }
  return [...found];
}

// ---- discovery via Alchemy (free; RPC only, no explorer API) ----
// 1) list every tx sent TO the factory (alchemy_getAssetTransfers, paginated).
// 2) trace each (trace_transaction has no block-range limit) and keep CREATEs.
// This finds the created lock contracts WITHOUT touching any owner/wallet data.
const MAX_TX = args.maxtx ? Number(args.maxtx) : Infinity;

async function alchemyFactoryTxHashes() {
  const hashes = new Set();
  let pageKey;
  do {
    const params = {
      fromBlock: "0x0", toBlock: "latest", toAddress: FACTORY,
      category: ["external"], excludeZeroValue: false, maxCount: "0x3e8",
    };
    if (pageKey) params.pageKey = pageKey;
    const res = await provider.send("alchemy_getAssetTransfers", [params]);
    for (const t of res.transfers || []) hashes.add(t.hash);
    pageKey = res.pageKey;
    process.stdout.write(`\r  factory txs collected: ${hashes.size}   `);
    if (hashes.size >= MAX_TX) break;
    await sleep(60);
  } while (pageKey);
  process.stdout.write("\n");
  return [...hashes].slice(0, MAX_TX === Infinity ? undefined : MAX_TX);
}

async function discoverViaAlchemy() {
  const hashes = await alchemyFactoryTxHashes();
  const found = new Set();
  const CONC = Number(args.conc || 6);
  let done = 0;
  for (let i = 0; i < hashes.length; i += CONC) {
    const batch = hashes.slice(i, i + CONC);
    const traceSets = await Promise.all(batch.map(async (h) => {
      try { return await provider.send("trace_transaction", [h]); }
      catch { return []; }
    }));
    for (const traces of traceSets) {
      for (const t of traces) {
        if (t.type === "create" && t.result?.address) found.add(ethers.getAddress(t.result.address));
      }
    }
    done += batch.length;
    process.stdout.write(`\r  traced ${done}/${hashes.length} txs — created contracts: ${found.size}   `);
    await sleep(40);
  }
  process.stdout.write("\n");
  return [...found];
}

// Default to the free Alchemy method (Etherscan's free tier excludes BSC).
const METHOD = args.via || "alchemy";
async function discover() {
  console.log(`(discovery method: ${METHOD})`);
  if (METHOD === "trace") return discoverViaTrace();
  if (METHOD === "api") return discoverViaApi();
  return discoverViaAlchemy();
}

// ---- decode one lock (same logic as the app's scanner) ----
function slotToAddress(word) {
  if (!word || word === "0x" + "0".repeat(64)) return null;
  if (word.slice(2, 26) !== "0".repeat(24)) return null;
  const addr = "0x" + word.slice(-40);
  if (!/^0x[0-9a-fA-F]{40}$/.test(addr)) return null;
  const c = ethers.getAddress(addr);
  return c === ethers.ZeroAddress ? null : c;
}

function estimateUsd(t0, t1, reserves, supply, held) {
  if (supply === 0n) return null;
  const a = t0.toLowerCase(), b = t1.toLowerCase();
  const r0 = BigInt(reserves[0]), r1 = BigInt(reserves[1]);
  let side = null, mult = 1;
  if (a === WBNB) { side = r0; mult = BNB_USD; }
  else if (b === WBNB) { side = r1; mult = BNB_USD; }
  else if (STABLES[a]) { side = r0; mult = STABLES[a]; }
  else if (STABLES[b]) { side = r1; mult = STABLES[b]; }
  if (side === null) return null;
  const underlying = (side * held) / supply;
  return Math.round(Number(ethers.formatEther(underlying)) * mult * 2);
}

async function analyze(address, refHash) {
  const row = { address: address.toLowerCase(), status: "skip", source: "discovered" };
  try {
    const code = await provider.getCode(address);
    if (code === "0x") return { ...row, status: "skip" };
    const match = ethers.keccak256(code) === refHash;
    if (!match) {
      return { ...row, status: code.toLowerCase().includes(REFUND_SELECTOR) ? "review" : "skip" };
    }
    // Layout: slot2 = project token, slot4 = unlock time, slot6 = DEX factory.
    // OWNER-BLIND: we do NOT read slot 3 (authorized caller) — projects, not people.
    // The LP pair is NOT stored; it's COMPUTED via factory.getPair(token, base).
    const [s2, s4, s6] = await Promise.all([
      provider.getStorage(address, 2),
      provider.getStorage(address, 4),
      provider.getStorage(address, 6),
    ]);
    const unlockTime = BigInt(s4);
    row.unlockTime = new Date(Number(unlockTime) * 1000).toISOString();

    const token = slotToAddress(s2);
    const factory = slotToAddress(s6);
    if (token) row.tokenAddress = token.toLowerCase(); // project token contract
    if (token && factory) {
      const fac = new ethers.Contract(factory, FACTORY_ABI, provider);
      for (const base of [WBNB, ...Object.keys(STABLES)]) {
        let pairAddr;
        try { pairAddr = await fac.getPair(token, base); } catch { continue; }
        if (!pairAddr || pairAddr === ethers.ZeroAddress) continue;
        try {
          const pair = new ethers.Contract(pairAddr, PAIR_ABI, provider);
          const held = await pair.balanceOf(address);
          if (held === 0n) continue;
          const [t0, t1, reserves, supply] = await Promise.all([
            pair.token0(), pair.token1(), pair.getReserves(), pair.totalSupply(),
          ]);
          row.lpToken = pairAddr.toLowerCase();
          row.estUsd = estimateUsd(t0, t1, reserves, supply, held);
          try { row.token = await new ethers.Contract(token, SYMBOL_ABI, provider).symbol(); } catch {}
          break;
        } catch { continue; }
      }
    }

    const now = BigInt(Math.floor(Date.now() / 1000));
    const funded = !!row.lpToken;
    if (!funded) row.status = "empty";
    else if (now <= unlockTime) row.status = "locked";
    else row.status = "RECOVERABLE";
    return row;
  } catch (e) {
    return { ...row, status: "error" };
  }
}

// ---- main ----
(async () => {
  const registry = JSON.parse(fs.readFileSync(REGISTRY, "utf8"));
  registry.factory = FACTORY;
  BNB_USD = await fetchBnbUsd();
  console.log(`BNB price (CoinGecko): $${BNB_USD}`);
  const known = new Map(registry.locks.map((l) => [l.address.toLowerCase(), l]));

  console.log(`Discovering locks created by factory ${FACTORY} ...`);
  let addrs = await discover();
  console.log(`Discovered ${addrs.length} candidate contracts.`);
  if (LIMIT !== Infinity) addrs = addrs.slice(0, LIMIT);

  if (args["discover-only"]) {
    for (const a of addrs) if (!known.has(a.toLowerCase())) known.set(a.toLowerCase(), { address: a.toLowerCase(), status: "review", source: "discovered" });
    save(registry, known);
    console.log(`Saved ${known.size} addresses (discover-only).`);
    return;
  }

  const refHash = ethers.keccak256(await provider.getCode(REFERENCE_LOCK));
  const todo = addrs.filter((a) => args.refresh || !known.has(a.toLowerCase()));
  console.log(`Decoding ${todo.length} locks (RPC: ${RPC}) ...`);

  const CONC = Number(args.conc || 8);
  const DELAY = Number(args.delay || 60);
  let done = 0;
  for (let i = 0; i < todo.length; i += CONC) {
    const batch = todo.slice(i, i + CONC);
    const rows = await Promise.all(batch.map((a) => analyze(a, refHash)));
    for (const r of rows) {
      // Strip any owner field defensively — never publish authorizedCaller.
      delete r.authorizedCaller;
      known.set(r.address, { ...(known.get(r.address) || {}), ...r });
    }
    done += batch.length;
    process.stdout.write(`\r  decoded ${done}/${todo.length}   `);
    if (done % 100 < CONC) save(registry, known); // checkpoint
    await sleep(DELAY);
  }
  process.stdout.write("\n");
  save(registry, known);

  const tally = {};
  for (const l of known.values()) tally[l.status] = (tally[l.status] || 0) + 1;
  console.log("Done. Library:", known.size, "locks.", JSON.stringify(tally));
})().catch((e) => { console.error("\nError:", e.message); process.exit(1); });

function save(registry, known) {
  registry.updated = new Date().toISOString().slice(0, 10);
  registry.bnbUsd = BNB_USD; // record the price values were computed at
  // Persist only FUNDED locks worth >= $1000 (recoverable + still-locked). Empty,
  // non-lock, and dust-value contracts are noise we don't keep in the library.
  registry.locks = [...known.values()].filter(
    (l) => (l.status === "RECOVERABLE" || l.status === "locked")
      && typeof l.estUsd === "number" && l.estUsd >= 1000,
  );
  fs.writeFileSync(REGISTRY, JSON.stringify(registry, null, 2) + "\n");
}
