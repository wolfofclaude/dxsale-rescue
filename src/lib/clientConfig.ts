// Client-readable config (NEXT_PUBLIC_* is inlined into the browser bundle).
// The tip address is a public receive address — safe to expose.

// Deployed RescueExecutor contract (EIP-7702). Blank = recovery flow shows the
// free DIY path only until the contract is deployed + audited.
export const RESCUE_EXECUTOR = process.env.NEXT_PUBLIC_RESCUE_EXECUTOR || "";

// These mirror the contract's hardcoded constants, for display only. The contract
// is the source of truth and can never exceed them.
export const FEE_BPS = 1_500;        // 15%
export const REFERRAL_SHARE_BPS = 1_000; // 10% of the fee (= 1.5% of the LP)
export const BNB_USD_CLIENT = Number(process.env.NEXT_PUBLIC_BNB_USD || "600");

export const feeFraction = FEE_BPS / 10_000;
export const referralFraction = REFERRAL_SHARE_BPS / 10_000;

// Public receive address for optional tips / support. Safe to expose.
export const TIP_ADDRESS =
  process.env.NEXT_PUBLIC_TIP_ADDRESS || "0x3fc583a172B86106167dD8919475EB1de45b5AfE";

// Project Telegram for support / contact.
export const TELEGRAM_HANDLE = "wolfofclaude";
export const TELEGRAM_URL = "https://t.me/wolfofclaude";

// Public base URL — used for metadata, robots, and sitemap. Set in Vercel.
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://dxsale-rescue.vercel.app"
).replace(/\/$/, "");
