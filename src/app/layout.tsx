import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { RefCapture } from "@/components/RefCapture";

export const metadata: Metadata = {
  title: "DXsale Rescue — recover your stranded LP at 0%",
  description:
    "Non-custodial recovery for DXsale liquidity locks stranded by the dead frontend. " +
    "Find your expired lock and unlock it yourself — no fee, no private keys.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <RefCapture />
        <header className="border-b border-edge">
          <nav className="container-x flex h-16 items-center justify-between">
            <Link href="/" className="font-mono text-sm font-bold text-brand">
              dxsale<span className="text-gray-400">.rescue</span>
            </Link>
            <div className="flex gap-5 text-sm text-gray-400">
              <Link href="/" className="hover:text-gray-100">Find my lock</Link>
              <Link href="/locks" className="hover:text-gray-100">Lock library</Link>
              <Link href="/how-it-works" className="hover:text-gray-100">How it works</Link>
              <Link href="/stats" className="hover:text-gray-100">Stats</Link>
              <a
                href="https://github.com/"
                className="hover:text-gray-100"
                target="_blank" rel="noreferrer"
              >GitHub</a>
            </div>
          </nav>
        </header>
        <main className="container-x py-12">{children}</main>
        <footer className="container-x border-t border-edge py-8 text-xs text-gray-500">
          Read-only by default. Recovery is non-custodial — you sign in your own
          wallet and keep 100%; no fee is taken. An optional tip is appreciated, and if
          someone referred you, a share of any tip goes to them (shown before you send).
          Not affiliated with DXsale.
        </footer>
      </body>
    </html>
  );
}
