// Client-readable config (NEXT_PUBLIC_* is inlined into the browser bundle).
// The tip address is a public receive address — safe to expose.

export const TIP_ADDRESS = process.env.NEXT_PUBLIC_TIP_ADDRESS || "";
export const TIP_BPS = Number(process.env.NEXT_PUBLIC_TIP_BPS || "1000"); // 10.00%
export const REFERRAL_SHARE_BPS = Number(
  process.env.NEXT_PUBLIC_REFERRAL_SHARE_BPS || "5000", // 50% of the tip
);
export const BNB_USD_CLIENT = Number(process.env.NEXT_PUBLIC_BNB_USD || "600");

export const tipFraction = TIP_BPS / 10_000;
export const referralFraction = REFERRAL_SHARE_BPS / 10_000;
