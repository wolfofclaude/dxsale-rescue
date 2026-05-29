// EIP-7702 one-transaction rescue: the owner authorizes their own wallet to run
// RescueExecutor for a single tx, which unlocks the lock and takes the hardcoded
// 15% fee atomically. Funds never leave the owner's account (non-custodial).

import { ethers } from "ethers";
import { RESCUE_EXECUTOR } from "./clientConfig";

const EXECUTOR_ABI = [
  "function rescue(address lock, address lpToken, address referrer)",
];

export interface RescueResult { hash: string; }

export async function rescueWith7702(
  eth: any,
  lock: string,
  lpToken: string,
  referrer: string | null,
): Promise<RescueResult> {
  if (!RESCUE_EXECUTOR) throw new Error("Recovery contract not deployed yet.");
  const provider = new ethers.BrowserProvider(eth);
  const signer = await provider.getSigner();
  const owner = await signer.getAddress();

  const net = await provider.getNetwork();
  if (net.chainId !== 56n) throw new Error("Switch your wallet to BNB Smart Chain.");

  // 1) Authorize: let the owner's EOA delegate to the executor for this tx.
  //    ethers fills nonce/chainId; the wallet must support EIP-7702.
  let authorization;
  try {
    authorization = await (signer as any).authorize({ address: RESCUE_EXECUTOR });
  } catch (e: any) {
    throw new Error(
      "Your wallet doesn't support EIP-7702 authorizations yet. Use a 7702-capable " +
      "wallet to recover your LP.",
    );
  }

  // 2) Send the type-4 tx TO the owner's own address (now carrying the delegated
  //    code), calling rescue(...). The unlock + fee split happen atomically.
  const iface = new ethers.Interface(EXECUTOR_ABI);
  const data = iface.encodeFunctionData("rescue", [
    lock, lpToken, referrer ?? ethers.ZeroAddress,
  ]);

  const tx = await signer.sendTransaction({
    type: 4,
    to: owner,
    data,
    authorizationList: [authorization],
  } as any);
  await tx.wait();
  return { hash: tx.hash };
}
