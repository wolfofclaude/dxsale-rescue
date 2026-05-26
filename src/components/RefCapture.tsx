"use client";

import { useEffect } from "react";
import { captureRefFromUrl } from "@/lib/referral";

// Mounted once in the root layout. Stores any ?ref=<address> the visitor
// arrives with, so an optional tip later can credit the referrer.
export function RefCapture() {
  useEffect(() => { captureRefFromUrl(); }, []);
  return null;
}
