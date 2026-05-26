// Grow the open lock library from a list of addresses.
//
//   node scripts/import-locks.mjs <addresses.json>
//
// <addresses.json> is a JSON array of lock addresses (e.g. the `candidates.json`
// produced by the sibling ../scanner discovery, or a hand-curated list). New,
// unique addresses are appended to src/data/locks.json. Existing entries and
// their metadata are preserved. No on-chain calls, no fabrication.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REGISTRY = path.join(__dirname, "..", "src", "data", "locks.json");

const input = process.argv[2];
if (!input) {
  console.error("Usage: node scripts/import-locks.mjs <addresses.json>");
  process.exit(1);
}

const isAddr = (a) => typeof a === "string" && /^0x[0-9a-fA-F]{40}$/.test(a);

const incoming = JSON.parse(fs.readFileSync(input, "utf8"));
const addrs = (Array.isArray(incoming) ? incoming : incoming.locks || [])
  .map((x) => (typeof x === "string" ? x : x.address))
  .filter(isAddr)
  .map((a) => a.toLowerCase());

const registry = JSON.parse(fs.readFileSync(REGISTRY, "utf8"));
const existing = new Set(registry.locks.map((l) => l.address.toLowerCase()));

let added = 0;
for (const a of new Set(addrs)) {
  if (existing.has(a)) continue;
  registry.locks.push({ address: a, source: "imported" });
  existing.add(a);
  added++;
}

registry.updated = new Date().toISOString().slice(0, 10);
fs.writeFileSync(REGISTRY, JSON.stringify(registry, null, 2) + "\n");
console.log(`Added ${added} new lock(s). Library now holds ${registry.locks.length}.`);
