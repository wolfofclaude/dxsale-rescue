// Referral attribution: capture ?ref=<address> from the URL, persist it, and
// expose it for the optional tip. Honest + simple — the referrer's share is
// paid from the tip and disclosed on screen. No tracking beyond the address.

import { ethers } from "ethers";

const KEY = "dxr_ref";
const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

interface StoredRef { address: string; ts: number; }

export function captureRefFromUrl(): void {
  if (typeof window === "undefined") return;
  const raw = new URLSearchParams(window.location.search).get("ref");
  if (!raw || !ethers.isAddress(raw)) return;
  const address = ethers.getAddress(raw);
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ address, ts: Date.now() }));
  } catch { /* storage unavailable — ignore */ }
}

export function getRef(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredRef;
    if (Date.now() - parsed.ts > TTL_MS) return null;
    return ethers.isAddress(parsed.address) ? parsed.address : null;
  } catch { return null; }
}
