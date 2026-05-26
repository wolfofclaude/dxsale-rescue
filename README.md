# DXsale Rescue

A non-custodial web tool to recover **DXsale LP locks stranded by the dead frontend**.
If your lock has expired, the liquidity is yours to claim — this app finds it and lets
you sign the unlock **in your own wallet**. No private keys leave your browser. **0% fee.**

This is the honest counterpart to the "official" legacy recovery site, which charges a
**40% minimum (up to 100%)** to return funds that are already yours.

## Stack
- Next.js 14 (App Router) + TypeScript + Tailwind
- ethers v6 (server reads via RPC; client unlock via injected wallet)
- Read-only analysis ported from the [`scanner`](../scanner) CLI

## How it stays safe
- **Decoding is anchored to a verified lock's bytecode hash.** Only locks with matching
  bytecode (identical storage layout) are auto-decoded; others are flagged for review.
- **Recovery is non-custodial.** The site never asks for or handles a private key; the
  owner signs `refundUniLP()` with their own wallet and the LP goes straight to them.
- **No target list.** `/stats` exposes aggregates only. Owners look up their own lock.

## Run locally
```bash
npm install
cp .env.example .env.local   # fill in RPC_URL; ETHERSCAN_API_KEY + FACTORY for wallet/stats
npm run dev
```
Lock-address lookup and recovery work with just `RPC_URL`. The "my wallet" lookup and the
`/stats` dashboard need `ETHERSCAN_API_KEY` + `FACTORY` (the DXsale deployer) for discovery.

## Deploy (Vercel)
1. Push to GitHub (the `.gitignore` already excludes `.env*`).
2. Import the repo in Vercel.
3. Set env vars in the Vercel project: `RPC_URL`, `ETHERSCAN_API_KEY`, `FACTORY`, `BNB_USD`.
4. Deploy.

## Routes
| Path | What |
|---|---|
| `/` | Find your lock (by lock address or launch wallet) |
| `/locks` | The open lock library — browsable registry, live status |
| `/recover?lock=…` | Connect wallet, verify ownership, sign the unlock |
| `/how-it-works` | The decode method + the 40–100% fee exposé |
| `/stats` | Aggregate scan of stranded locks (no owner list) |
| `/api/lookup` | `?lock=` or `?wallet=` → lock report(s) |
| `/api/locks` | the registry, enriched with live status (owner omitted) |
| `/api/stats` | aggregate counts + reachable USD |

## The open lock library

There is no public registry of DXsale locks anywhere — `src/data/locks.json` is one.
It holds **addresses only**; status, value, and ownership are read live from chain. It
is intentionally **not** a target list (owner wallets are omitted from the public view).

Grow it from discovery output or a curated list:
```bash
# e.g. import the candidates the sibling ../scanner produced
node scripts/import-locks.mjs ../scanner/candidates.json
```
Only ever add **real, verified** lock addresses. Never fabricate entries.

## Ethics
Only for helping **rightful owners reach their own expired locks**. Not for springing
active locks or touching anyone else's funds.
