import type { Metadata } from "next";
import Link from "next/link";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { RefCapture } from "@/components/RefCapture";
import { ConnectButton } from "@/components/ConnectButton";
import { GithubNavLink, GithubMark } from "@/components/GithubStar";
import {
  SITE_URL, TELEGRAM_URL, TELEGRAM_HANDLE, TELEGRAM_URL_DEV, TELEGRAM_HANDLE_DEV, GITHUB_URL,
} from "@/lib/clientConfig";

// Inter for body/UI; Space Grotesk for display headings, self-hosted by next/font.
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});
const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const TITLE = "DXsale Rescue: recover your stranded LP in one signature";
const DESC =
  "Non-custodial recovery for DXsale liquidity locks stranded by the dead frontend. " +
  "Find your expired lock and unlock it in one EIP-7702 signature. Flat, hardcoded 15% " +
  "fee (vs the legacy tool's 40-100%).";

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
    <html lang="en" className={`${inter.variable} ${display.variable}`}>
      <body>
        <RefCapture />
        <header className="sticky top-0 z-40 border-b border-edge/70 bg-ink/70 backdrop-blur-xl">
          <nav className="container-x flex h-20 items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-brand ring-4 ring-brand/15" />
              <span className="font-display text-[15px] font-semibold tracking-tight text-gray-50">DXsale Rescue</span>
            </Link>
            <div className="flex items-center gap-5 text-sm text-gray-400 sm:gap-7">
              <Link href="/" className="hidden transition hover:text-gray-50 sm:inline">Find</Link>
              <Link href="/locks" className="transition hover:text-gray-50">Library</Link>
              <Link href="/how-it-works" className="hidden transition hover:text-gray-50 sm:inline">How it works</Link>
              <Link href="/stats" className="hidden transition hover:text-gray-50 sm:inline">Stats</Link>
              <GithubNavLink />
              <ConnectButton />
            </div>
          </nav>
        </header>
        <main className="container-x py-12 sm:py-16">{children}</main>
        <footer className="container-x border-t border-edge py-10 text-xs leading-relaxed text-gray-500">
          <p>
            Non-custodial recovery via EIP-7702; funds never leave your wallet. Flat 15%
            service fee, hardcoded in the contract. Not affiliated with DXsale.
          </p>
          <p className="mt-2">
            Questions or need a hand recovering? Message us on Telegram:{" "}
            <a href={TELEGRAM_URL} target="_blank" rel="noreferrer" className="text-gray-300 underline hover:text-gray-100">
              @{TELEGRAM_HANDLE}
            </a>{" "}
            or{" "}
            <a href={TELEGRAM_URL_DEV} target="_blank" rel="noreferrer" className="text-gray-300 underline hover:text-gray-100">
              @{TELEGRAM_HANDLE_DEV}
            </a>
          </p>
          <p className="mt-2">
            Open source, MIT licensed. If this got your liquidity back,{" "}
            <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 align-baseline text-gray-300 underline hover:text-gray-100">
              <GithubMark className="h-3.5 w-3.5" />star it on GitHub
            </a>.
          </p>
        </footer>
      </body>
    </html>
  );
}
