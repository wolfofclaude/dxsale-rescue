#!/usr/bin/env bash
# One-shot deploy + verify for RescueExecutor on BNB Smart Chain.
#
# Reads RPC_URL / PRIVATE_KEY / FEE_WALLET / ETHERSCAN_API_KEY from .env at
# runtime. Nothing is printed except public values (deployer address, balance,
# deployed address). Run it yourself:
#
#     bash deploy.sh
#
set -euo pipefail

# Find forge (fall back to the standard Foundry location if not on PATH).
command -v forge >/dev/null 2>&1 || export PATH="$PATH:$HOME/.foundry/bin"
command -v forge >/dev/null 2>&1 || { echo "ERROR: forge not found. Install Foundry."; exit 1; }

# Load secrets from .env into the environment (values are not echoed).
[ -f .env ] || { echo "ERROR: .env not found in $(pwd)"; exit 1; }
set -a; . ./.env; set +a

# Required values present?
: "${RPC_URL:?missing in .env}"
: "${PRIVATE_KEY:?missing in .env}"
: "${FEE_WALLET:?missing in .env}"
: "${ETHERSCAN_API_KEY:?missing in .env}"

# Preflight 1: RPC reachable and on BSC (chain 56)?
CHAIN=$(cast chain-id --rpc-url "$RPC_URL" 2>/dev/null || echo "ERR")
[ "$CHAIN" = "56" ] || { echo "ERROR: RPC_URL is on chain '$CHAIN', expected 56 (BSC). Fix RPC_URL in .env."; exit 1; }
echo "RPC OK (chain 56)."

# Preflight 2: deployer derived from the key, and is it funded?
DEPLOYER=$(cast wallet address --private-key "$PRIVATE_KEY")
BAL=$(cast balance "$DEPLOYER" --rpc-url "$RPC_URL")
echo "Deployer:  $DEPLOYER"
echo "Fee wallet: $FEE_WALLET"
echo "Balance:   $(cast from-wei "$BAL") BNB"
[ "$BAL" != "0" ] || { echo "ERROR: deployer has 0 BNB. Fund $DEPLOYER and retry."; exit 1; }

echo ""
echo "Deploying RescueExecutor(feeWallet=$FEE_WALLET) to BSC + verifying on BscScan..."
forge script script/Deploy.s.sol:Deploy --rpc-url bsc --broadcast --verify

echo ""
echo "Done. Copy the 'RescueExecutor deployed: 0x...' address into"
echo "NEXT_PUBLIC_RESCUE_EXECUTOR in .env, then restart the dev server."
