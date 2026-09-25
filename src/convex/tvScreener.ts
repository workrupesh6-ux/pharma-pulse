import type { PharmaSector } from "./pharmaData";
import { deskForName } from "./pharmaTaxonomy";

/**
 * Screening source.
 *
 * The NSE equity master says what is listed, but not what a company does, so
 * the desk originally had to guess from registered names — and names are a poor
 * witness. Cipla, Lupin, Biocon and Dr Reddy's carry no pharmaceutical word at
 * all, so keyword matching could never find them.
 *
 * TradingView publishes an industry classification for the Indian market and
 * serves it from a plain JSON screener endpoint that needs no key, no session
 * and no OAuth handshake. One POST returns the whole Health Technology sector
 * for NSE, each row carrying a real industry label. A listing filed under
 * Pharmaceuticals or Biotechnology is a drug maker by someone else's judgement
 * rather than this desk's regex, which is exactly the second opinion the roster
 * wanted.
 *
 * Note that "Medical Specialties" sits inside the same sector — contact lenses,
 * hospital equipment — and is deliberately dropped. It is health care, but it
 * is not a medicine, and it is the same line the desk draws for hospital and
 * diagnostic-lab chains.
 */

/**
 * The screener is one host, but kept as a list so a mirror or a replacement
 * endpoint can be added without touching the caller — the same shape the quote
 * feed uses.
 */
const SCREENER_HOSTS = ["https://scanner.tradingview.com/india/scan"];

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const REQUEST_TIMEOUT_MS = 12_000;

/** The Health Technology industries that actually make medicine. */
const PHARMA_INDUSTRY = /^(pharmaceuticals|biotechnology)/i;

export type ScreenRow = {
  symbol: string;
  /** The screener's own company name, which is better cased than the master's. */
  name: string;
  /** The screener's industry label, recorded on the roster row as provenance. */
  industry: string;
  sector: PharmaSector;
};

/** Whether a screener industry label describes a drug maker. */
export function isPharmaScreenIndustry(industry: string): boolean {
  return PHARMA_INDUSTRY.test(industry.trim());
}

/**
 * The desk a screened name belongs on. A multinational parent still outranks
 * the industry label, so Abbott and Sanofi keep their own desk; everything else
 * trusts the label where it is specific (Biotechnology) and falls back to the
 * name markers every other desk already uses.
 */
export function deskForScreen(industry: string, name: string): PharmaSector {
  const desk = deskForName(name);
  if (desk === "MNC Pharma") return desk;
  return /^biotechnology/i.test(industry.trim()) ? "Biologics" : desk;
}

type ScanResponse = {
  totalCount?: number;
  data?: Array<{ s?: unknown; d?: unknown }>;
};

/** One attempt against a single host. Never throws — a failure comes back as null. */
async function attempt(host: string): Promise<ScreenRow[] | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(host, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "User-Agent": USER_AGENT,
      },
      // Column order here is the order of the values in each row's `d` array.
      body: JSON.stringify({
        filter: [
          { left: "sector", operation: "equal", right: "Health Technology" },
          { left: "exchange", operation: "equal", right: "NSE" },
        ],
        options: { lang: "en" },
        markets: ["india"],
        columns: ["name", "description", "industry"],
        sort: { sortBy: "market_cap_basic", sortOrder: "desc" },
        range: [0, 900],
      }),
    });

    if (!response.ok) return null;

    const payload = (await response.json()) as ScanResponse;
    const rows: ScreenRow[] = [];

    for (const entry of payload.data ?? []) {
      const [symbol, description, industry] = (entry.d ?? []) as unknown[];

      if (
        typeof symbol !== "string" ||
        typeof description !== "string" ||
        typeof industry !== "string"
      ) {
        continue;
      }
      if (!isPharmaScreenIndustry(industry)) continue;

      rows.push({
        symbol,
        name: description,
        industry,
        sector: deskForScreen(industry, description),
      });
    }

    return rows;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Every NSE-listed pharmaceutical name the screener knows, or `null` when the
 * screener could not be reached. A null is not an empty roster: the caller keeps
 * its keyword fallback, so an outage narrows the sweep instead of emptying it.
 */
export async function fetchPharmaScreenings(): Promise<ScreenRow[] | null> {
  for (const host of SCREENER_HOSTS) {
    const rows = await attempt(host);
    if (rows) return rows;
  }

  return null;
}
