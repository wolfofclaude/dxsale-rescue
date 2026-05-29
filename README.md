# DXsale Rescue

One-signature, non-custodial recovery for liquidity stranded in legacy **DXsale LP locks** on BNB Smart Chain.

> Independent tool. Not affiliated with DXsale.

---

## The problem

Thousands of BNB-chain projects locked their PancakeSwap LP on DXsale to prove they would not pull liquidity. The LP sits in a per-launch lock contract until an unlock timestamp passes. Then DXsale's frontend went dark.

The lock contracts still work perfectly. The unlock function, `refundUniLP()` (selector `0xe50a4f80`), is public and lives on-chain. But with no UI, owners have no obvious button to call it, so expired, claimable liquidity just sits there. This tool finds those locks and opens them.

## How recovery works (EIP-7702)

A DXsale lock only obeys **one address**: the original owner, stored in storage slot 3 (`authorizedCaller`). Call `refundUniLP()` from anyone else and it reverts. That is why a plain "rescue contract" cannot help, the lock would reject it.

`RescueExecutor` gets around this with **EIP-7702**:

1. The owner signs an authorization delegating their own wallet to `RescueExecutor`.
2. A type-4 transaction is sent to the owner's own address, calling `rescue(lock, lpToken, referrer)`.
3. The owner's account now runs the contract's code, so `address(this)` **is the owner**. When it calls `lock.refundUniLP()`, the lock sees its authorized caller and releases the LP into the owner's account.
4. In the same atomic transaction, the contract takes the service fee and leaves the rest with the owner.

`RescueExecutor` has no special power over the lock. It only works because the owner runs it as themselves, and a `require(msg.sender == address(this))` guard means nobody else can trigger it. It cannot be pointed at someone else's lock.

## Fees, and the free alternative

- **Flat 15% service fee**, hardcoded as a `constant` in the contract. It can never be raised or exceeded.
- **You keep 85%.** Funds never leave your own wallet (non-custodial via 7702). The exact split is shown before you sign.
- **Optional referral:** a referrer earns 10% of the fee (1.5% of the LP). Your 85% is unchanged.
- **You never have to pay.** `refundUniLP()` is a public function. From your owner wallet you can call it directly on BscScan's "Write Contract" tab, or run the open-source script, and keep 100% for the cost of gas. The 15% is for the one-click convenience, not a gate. This is stated openly in the app.

## Warning: dxsale.one is a wallet drainer

The "legacy recovery" site circulating as DXsale's, `lpsearch.dxsale.one`, is malicious. Analysis of its own JavaScript shows it:

- skims a cut of your tokens to a hardcoded wallet, labeling the step "Verification complete,"
- sets that cut from an AI "scam check" (`feeBps: isScam ? 1e4 : 4e3`, i.e. 40% by default, 100% if flagged),
- exfiltrates your address and position value to its own `/api/wallet-track` backend, and
- offers a one-signature EIP-7702 flow that delegates your wallet to its extractor and batches the drain.

Do not connect a wallet to it. The verified official DXsale domain is `dxsale.app`.

## Contract: RescueExecutor

- Network: BNB Smart Chain (chainId 56)
- Address: set in `NEXT_PUBLIC_RESCUE_EXECUTOR` (read the verified source on BscScan)
- Solidity 0.8.24, optimizer 200 runs, non-upgradeable, no owner/admin functions
- **Not audited.** It handles user funds. Get an independent audit before pointing it at large value.

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

## Local development

```bash
npm install
cp .env.example .env       # fill RPC_URL, etc.
npm run dev                # http://localhost:3000
```

Lock-address lookup and recovery work with just `RPC_URL`. The wallet lookup and `/stats` dashboard also use `ETHERSCAN_API_KEY` + `FACTORY` for discovery.

## Contract: build, test, deploy, verify

Requires [Foundry](https://book.getfoundry.sh/).

```bash
forge build
forge test -vvv                              # runs the 7702 simulation suite

# deploy + verify (reads RPC_URL / PRIVATE_KEY / FEE_WALLET / ETHERSCAN_API_KEY from .env)
bash deploy.sh
```

After deploying, set `NEXT_PUBLIC_RESCUE_EXECUTOR` to the new address to activate the recover flow.

## Routes

| Path | What |
|---|---|
| `/` | Find your lock; live stats; the drainer warning |
| `/locks` | The open lock library (projects only, browsable, live status) |
| `/recover?lock=…` | Connect wallet, verify ownership, sign the unlock |
| `/how-it-works` | The decode method, the 7702 flow, and the dxsale.one exposé |
| `/stats` | Aggregate scan of stranded locks (no owner list) |

## Disclaimer

This software is provided as is, without warranty, under the MIT License. It is not affiliated with, endorsed by, or connected to DXsale. The contract is unaudited. You are responsible for verifying the contract and lock addresses you interact with. You can always recover your own liquidity for free by calling `refundUniLP()` directly.
