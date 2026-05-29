import type { Metadata } from "next";
import Link from "next/link";
import { Inter } from "next/font/google";
import "./globals.css";
import { RefCapture } from "@/components/RefCapture";
import { ConnectButton } from "@/components/ConnectButton";
import { SITE_URL, TELEGRAM_URL, TELEGRAM_HANDLE } from "@/lib/clientConfig";

// Inter: the geometric UI sans behind most Uber-style dashboards (Uber Move is
// proprietary). Self-hosted by next/font, with tabular figures enabled in CSS.
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const TITLE = "DXsale Rescue: recover your stranded LP in one signature";
const DESC =
  "Non-custodial recovery for DXsale liquidity locks stranded by the dead frontend. " +
  "Find your expired lock and unlock it in one EIP-7702 signature. Flat, hardcoded 15% " +
  "fee (vs the legacy tool's 40-100%). Recover for free yourself anytime.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: TITLE, template: "%s · DXsale Rescue" },
  description: DESC,
  applicationName: "DXsale Rescue",
  keywords: ["DXsale", "LP lock", "liquidity recovery", "BSC", "refundUniLP", "EIP-7702"],
  alternates: { canonical: "/" },
  openGraph: { title: TITLE, description: DESC, url: SITE_URL, siteName: "DXsale Rescue", type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESC },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <RefCapture />
        <header className="border-b border-edge">
          <nav className="container-x flex h-20 items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-brand" />
              <span className="text-base font-semibold tracking-tight text-gray-50">DXsale Rescue</span>
            </Link>
            <div className="flex items-center gap-7 text-sm text-gray-400">
              <Link href="/" className="hidden hover:text-gray-50 transition sm:inline">Find</Link>
              <Link href="/locks" className="hover:text-gray-50 transition">Library</Link>
              <Link href="/how-it-works" className="hidden hover:text-gray-50 transition sm:inline">How it works</Link>
              <Link href="/stats" className="hidden hover:text-gray-50 transition sm:inline">Stats</Link>
              <ConnectButton />
            </div>
          </nav>
        </header>
        <main className="container-x py-12 sm:py-16">{children}</main>
        <footer className="container-x border-t border-edge py-10 text-xs leading-relaxed text-gray-500">
          <p>
            Non-custodial recovery via EIP-7702; funds never leave your wallet. Flat 15%
            service fee, hardcoded in the contract. You can always recover for free
            yourself; the fee is for the tooling. Not affiliated with DXsale.
          </p>
          <p className="mt-2">
            Questions or need a hand recovering?{" "}
            <a href={TELEGRAM_URL} target="_blank" rel="noreferrer" className="text-gray-300 underline hover:text-gray-100">
              @{TELEGRAM_HANDLE} on Telegram
            </a>
          </p>
        </footer>
      </body>
    </html>
  );
}
