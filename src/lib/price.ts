// Live BNB/USD price from CoinGecko, cached 5 min, with a safe fallback.

const COINGECKO =
  "https://api.coingecko.com/api/v3/simple/price?ids=binancecoin&vs_currencies=usd";

let cache: { usd: number; at: number } = { usd: 0, at: 0 };
const TTL = 5 * 60 * 1000;

export async function getBnbUsd(): Promise<number> {
  const fallback = Number(process.env.BNB_USD || 600);
  if (cache.usd > 0 && Date.now() - cache.at < TTL) return cache.usd;
  try {
    const res = await fetch(COINGECKO, { next: { revalidate: 300 } } as any);
    const json: any = await res.json();
    const usd = Number(json?.binancecoin?.usd);
    if (usd > 0) {
      cache = { usd, at: Date.now() };
      return usd;
    }
  } catch { /* network/ratelimit — fall through */ }
  return cache.usd > 0 ? cache.usd : fallback;
}
