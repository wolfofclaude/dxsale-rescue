import { NextResponse } from "next/server";
import { ethers } from "ethers";
import { getProvider, referenceHash, analyzeLock } from "@/lib/scanner";
import { getBnbUsd } from "@/lib/price";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const FACTORIES: [string, string][] = [
  ["0xca143ce32fe78f1f7019d7d551a6402fc5350c73", "PancakeSwap V2"],
  ["0xbcfccbde45ce874adcb698cc183debcf17952812", "PancakeSwap V1"],
];
const WBNB = "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c";
const BASES: Record<string, string> = {
  [WBNB]: "WBNB",
  "0xe9e7cea3dedca5984780bafc599bd69add087d56": "BUSD",
  "0x55d398326f99059ff775485246999027b3197955": "USDT",
};
const ERC20 = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
];
const FACT = ["function getPair(address,address) view returns (address)"];
const PAIR = [
  "function getReserves() view returns (uint112,uint112,uint32)",
  "function totalSupply() view returns (uint256)",
  "function token0() view returns (address)",
  "function token1() view returns (address)",
  "function balanceOf(address) view returns (uint256)",
];
const ZERO = "0x0000000000000000000000000000000000000000";

async function topLpHolders(provider: ethers.JsonRpcProvider, pair: string) {
  const bal = new Map<string, number>();
  let pageKey: string | undefined; let pages = 0;
  do {
    const params: any = {
      fromBlock: "0x0", toBlock: "latest", contractAddresses: [pair],
      category: ["erc20"], maxCount: "0x3e8", excludeZeroValue: false,
    };
    if (pageKey) params.pageKey = pageKey;
    const res = await provider.send("alchemy_getAssetTransfers", [params]);
    for (const t of res.transfers || []) {
      const v = Number(t.value || 0);
      const from = (t.from || "").toLowerCase(), to = (t.to || "").toLowerCase();
      if (from && from !== ZERO) bal.set(from, (bal.get(from) || 0) - v);
      if (to && to !== ZERO) bal.set(to, (bal.get(to) || 0) + v);
    }
    pageKey = res.pageKey; pages++;
  } while (pageKey && pages < 30);
  return [...bal.entries()].filter(([, v]) => v > 1e-12).sort((a, b) => b[1] - a[1]).slice(0, 6);
}

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token");
  if (!token || !ethers.isAddress(token)) {
    return NextResponse.json({ error: "Invalid token address." }, { status: 400 });
  }
  const provider = getProvider();
  const bnb = await getBnbUsd();
  const out: any = { token: ethers.getAddress(token), bnbUsd: bnb };

  try {
    const erc = new ethers.Contract(token, ERC20, provider);
    const [name, symbol, decimals, supply] = await Promise.all([
      erc.name().catch(() => null), erc.symbol().catch(() => null),
      erc.decimals().catch(() => 18), erc.totalSupply().catch(() => 0n),
    ]);
    out.name = name; out.symbol = symbol; out.decimals = Number(decimals);
    out.totalSupply = supply ? ethers.formatUnits(supply, Number(decimals)) : null;

    out.pools = [];
    const refHash = await referenceHash(provider).catch(() => null);
    for (const [factory, dexName] of FACTORIES) {
      const fac = new ethers.Contract(factory, FACT, provider);
      for (const base of Object.keys(BASES)) {
        try {
          const pairAddr: string = await fac.getPair(token, base).catch(() => ZERO);
          if (!pairAddr || pairAddr === ZERO) continue;
          const pc = new ethers.Contract(pairAddr, PAIR, provider);
          const [reserves, lpSupply, t0] = await Promise.all([
            pc.getReserves(), pc.totalSupply(), pc.token0(),
          ]);
          const baseReserve: bigint = t0.toLowerCase() === base ? reserves[0] : reserves[1];
          const baseUsd = base === WBNB ? bnb : 1;
          const poolUsd = Math.round(Number(ethers.formatEther(baseReserve)) * baseUsd * 2);

          const holders = await topLpHolders(provider, pairAddr);
          const enriched = [];
          for (const [addr, approxBal] of holders) {
            const code = await provider.getCode(addr).catch(() => "0x");
            const isContract = code !== "0x";
            const liveBal: bigint = await pc.balanceOf(addr).catch(() => 0n);
            const pct = lpSupply > 0n ? Number((liveBal * 10000n) / lpSupply) / 100 : 0;
            const entry: any = { address: ethers.getAddress(addr), isContract, lpPercent: pct };
            if (isContract && refHash && ethers.keccak256(code) === refHash) {
              entry.type = "DXsale lock (matching template)";
              const rep = await analyzeLock(provider, addr, refHash, bnb);
              entry.lockStatus = rep.status;
              entry.unlockTime = rep.unlockTime;
              entry.recoverable = rep.status === "RECOVERABLE";
            } else if (isContract) {
              entry.type = "contract (locker or other; not DXsale template)";
            } else {
              entry.type = "EOA wallet (held by a wallet, not a lock contract)";
            }
            enriched.push(entry);
          }
          out.pools.push({
            dex: dexName, pair: ethers.getAddress(pairAddr), base: BASES[base],
            poolUsd, lpSupply: ethers.formatUnits(lpSupply, 18), topHolders: enriched,
          });
        } catch (e: any) {
          out.pools.push({ dex: dexName, base: BASES[base],
            error: e?.shortMessage || e?.message, code: e?.code, operation: e?.operation });
        }
      }
    }
    return NextResponse.json(out);
  } catch (e: any) {
    return NextResponse.json({ ...out, error: e?.shortMessage || e?.message }, { status: 500 });
  }
}
