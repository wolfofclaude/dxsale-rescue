// Shared on-chain constants and ABIs for the DXsale rescue tool (BSC).

export const RPC_URL =
  process.env.RPC_URL || "https://bsc-dataseed.binance.org/";

export const BNB_USD = Number(process.env.BNB_USD || "600");

// The lock you already verified — the bytecode reference for safe decoding.
export const REFERENCE_LOCK =
  "0x30594e7cc7787f5eb1397656c1588f64bddbfbf7";

// refundUniLP() selector — presence in code signals a DXsale lock.
export const REFUND_SELECTOR = "e50a4f80";

export const WBNB = "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c";

// stablecoin => USD price
export const STABLES: Record<string, number> = {
  "0xe9e7cea3dedca5984780bafc599bd69add087d56": 1, // BUSD
  "0x55d398326f99059ff775485246999027b3197955": 1, // USDT
  "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d": 1, // USDC
};

export const LOCK_ABI = ["function refundUniLP()"];

export const FACTORY_ABI = ["function getPair(address,address) view returns (address)"];

export const PAIR_ABI = [
  "function token0() view returns (address)",
  "function token1() view returns (address)",
  "function getReserves() view returns (uint112,uint112,uint32)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function symbol() view returns (string)",
];

export type LockStatus =
  | "RECOVERABLE"
  | "locked"
  | "empty"
  | "withdrawn-flag"
  | "review"
  | "skip"
  | "error";

export interface LockReport {
  address: string;
  status: LockStatus;
  note?: string;
  codeMatch?: boolean;
  authorizedCaller?: string | null;
  unlockTime?: string | null; // ISO
  withdrawn?: boolean;
  tokenAddress?: string | null; // project token contract
  lpToken?: string | null;
  lpHeld?: string | null; // formatted units
  estUsd?: number | null;
}
