<div align="center">

# DXsale Rescue

**One-signature, non-custodial recovery for liquidity stranded in legacy DXsale LP locks on BNB Smart Chain.**

[![Network](https://img.shields.io/badge/network-BNB%20Smart%20Chain-F0B90B?logo=binance&logoColor=white)](https://www.bnbchain.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14-000000?logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.24-363636?logo=solidity&logoColor=white)](https://soliditylang.org/)
[![EIP-7702](https://img.shields.io/badge/EIP--7702-account%20delegation-5B5BD6)](https://eips.ethereum.org/EIPS/eip-7702)
[![License: MIT](https://img.shields.io/badge/license-MIT-22c55e)](./LICENSE)

<sub>Independent tool. Not affiliated with DXsale.</sub>

</div>

---

## Contents

- [The problem](#the-problem)
- [How recovery works (EIP-7702)](#how-recovery-works-eip-7702)
- [Fees and referral](#fees-and-referral)
- [Security: dxsale.one is a wallet drainer](#security-dxsaleone-is-a-wallet-drainer)
- [Contract: RescueExecutor](#contract-rescueexecutor)
- [Environment variables](#environment-variables)
- [Local development](#local-development)
- [Build, test, deploy, verify](#build-test-deploy-verify)
- [Routes](#routes)
- [Disclaimer](#disclaimer)

---

## The problem

Thousands of BNB-chain projects locked their PancakeSwap LP on DXsale to prove they would not pull liquidity. The LP sits in a per-launch lock contract until an unlock timestamp passes. Then DXsale's frontend went dark.

The lock contracts still work perfectly. The unlock function, `refundUniLP()` (selector `0xe50a4f80`), is public and lives on-chain. But with no UI, owners have no obvious button to call it, so expired, claimable liquidity just sits there. This tool finds those locks and opens them.

## How recovery works (EIP-7702)

A DXsale lock only obeys **one address**: the original owner, stored in storage slot 3 (`authorizedCaller`). Call `refundUniLP()` from anyone else and it reverts. That is why a plain "rescue contract" cannot help; the lock would reject it.

`RescueExecutor` gets around this with **EIP-7702**:

1. The owner signs an authorization delegating their own wallet to `RescueExecutor`.
2. A type-4 transaction is sent to the owner's own address, calling `rescue(lock, lpToken, referrer)`.
3. The owner's account now runs the contract's code, so `address(this)` **is the owner**. When it calls `lock.refundUniLP()`, the lock sees its authorized caller and releases the LP into the owner's account.
4. In the same atomic transaction, the contract takes the service fee and leaves the rest with the owner.

> [!NOTE]
> `RescueExecutor` has no special power over the lock. It only works because the owner runs it as themselves, and a `require(msg.sender == address(this))` guard means nobody else can trigger it. It cannot be pointed at someone else's lock.

## Fees and referral

| | |
|---|---|
| **Service fee** | Flat **15%**, hardcoded as a `constant` in the contract. It can never be raised or exceeded. |
| **You keep** | **85%.** Funds never leave your own wallet (non-custodial via 7702). |
| **Transparency** | The exact split is shown before you sign. |
| **Referral (optional)** | A referrer earns 10% of the fee (1.5% of the LP). Your 85% is unchanged. |

## Security: dxsale.one is a wallet drainer

> [!CAUTION]
> The "legacy recovery" site circulating as DXsale's, **`lpsearch.dxsale.one`**, is malicious. Do not connect a wallet to it. The verified official DXsale domain is **`dxsale.app`**.

Analysis of its own JavaScript shows it:

- skims a cut of your tokens to a hardcoded wallet, labeling the step "Verification complete,"
- sets that cut from an AI "scam check" (`feeBps: isScam ? 1e4 : 4e3`, i.e. 40% by default, 100% if flagged),
- exfiltrates your address and position value to its own `/api/wallet-track` backend, and
- offers a one-signature EIP-7702 flow that delegates your wallet to its extractor and batches the drain.

## Contract: RescueExecutor

| | |
|---|---|
| **Network** | BNB Smart Chain (chainId 56) |
| **Address** | set in `NEXT_PUBLIC_RESCUE_EXECUTOR` (read the verified source on BscScan) |
| **Compiler** | Solidity 0.8.24, optimizer 200 runs |
| **Design** | non-upgradeable, no owner/admin functions |

> [!WARNING]
> **Not audited.** It handles user funds. Get an independent audit before pointing it at large value.

## Environment variables

Copy `.env.example` to `.env` and fill it in. `Server` vars stay on the backend; `Client` (`NEXT_PUBLIC_*`) vars are inlined into the browser bundle, so never put a secret in one.

| Variable | Scope | Needed for | Purpose |
|---|---|---|---|
| `RPC_URL` | Server | App | BSC RPC for on-chain reads. An archive node is best for old locks. |
| `NEXT_PUBLIC_RESCUE_EXECUTOR` | Client | App | Deployed RescueExecutor address. Activates the recover flow. |
| `NEXT_PUBLIC_SITE_URL` | Client | App | Canonical base URL for metadata, sitemap, and robots. |
| `ETHERSCAN_API_KEY` | Server | `/stats`, lookup | Etherscan v2 key (chainId 56) for wallet discovery and the stats scan. |
| `FACTORY` | Server | `/stats`, indexer | DXsale presale factory whose created contracts are the locks. |
| `BNB_USD` / `NEXT_PUBLIC_BNB_USD` | Both | Optional | BNB price fallback for value display (default `600`). |
| `NEXT_PUBLIC_TIP_ADDRESS` | Client | Optional | Optional tip/support address. |
| `PRIVATE_KEY` | Local only | Deploy | Deployer key for Foundry. **Never commit it or upload it to a host.** |
| `FEE_WALLET` | Local only | Deploy | Public deploy/fee address. Baked into the contract at deploy; the app never reads it. |

## Local development

```bash
npm install
cp .env.example .env       # fill RPC_URL, etc.
npm run dev                # http://localhost:3000
```

Lock-address lookup and recovery work with just `RPC_URL`. The wallet lookup and `/stats` dashboard also use `ETHERSCAN_API_KEY` + `FACTORY` for discovery.

## Build, test, deploy, verify

Requires [Foundry](https://book.getfoundry.sh/).

```bash
forge build
forge test -vvv                              # runs the 7702 simulation suite

# deploy + verify (reads RPC_URL / PRIVATE_KEY / FEE_WALLET / ETHERSCAN_API_KEY from .env)
bash deploy.sh
```

After deploying, set `NEXT_PUBLIC_RESCUE_EXECUTOR` to the new address to activate the recover flow.

## Project layout

```
contracts/        RescueExecutor.sol           the 7702 rescue contract
test/             RescueExecutor.t.sol         Foundry tests (real 7702 cheatcodes)
script/           Deploy.s.sol                 forge deploy script
src/app/          Next.js app (App Router)     pages: /, /locks, /recover, /how-it-works, /stats
src/lib/          chain, scanner, library, price, rescue7702, clientConfig
src/components/   UI components (TrustPanel, ConnectButton, LookupForm, ...)
src/data/         locks.json                   indexed lock library (projects only, no owner wallets)
scripts/          index-locks, add-token-info  data pipeline
```

## Routes

| Path | What |
|---|---|
| `/` | Find your lock; live stats; the drainer warning |
| `/locks` | The open lock library (projects only, browsable, live status) |
| `/recover?lock=…` | Connect wallet, verify ownership, sign the unlock |
| `/how-it-works` | The decode method, the 7702 flow, and the dxsale.one exposé |
| `/stats` | Aggregate scan of stranded locks (no owner list) |

## Disclaimer

This software is provided as is, without warranty, under the MIT License. It is not affiliated with, endorsed by, or connected to DXsale. The contract is unaudited. You are responsible for verifying the contract and lock addresses you interact with.
