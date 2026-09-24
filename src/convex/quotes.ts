import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { PHARMA_COMPANIES } from "./pharmaData";

/**
 * Live quote source.
 *
 * NSE does not publish a keyless HTTP quote endpoint, and its "NSE MCP" server
 * is a JSON-RPC Model Context Protocol endpoint meant for local AI clients: it
 * needs a session handshake and a third-party API key before it will answer.
 * For a hosted live board we read the same NSE-listed symbols from Yahoo
 * Finance's public chart feed, which quotes NSE tickers (`SYMBOL.NS`) in near
 * real time with no key required. Point QUOTE_HOSTS at another provider and the
 * rest of the app is unchanged.
 */
const QUOTE_HOSTS = [
  "https://query1.finance.yahoo.com/v8/finance/chart",
  "https://query2.finance.yahoo.com/v8/finance/chart",
];

/** Keeps the number of simultaneous outbound requests small. */
const BATCH_SIZE = 8;

type Quote = {
  symbol: string;
  price?: number;
  previousClose?: number;
  change?: number;
  changePercent?: number;
  dayHigh?: number;
  dayLow?: number;
  volume?: number;
  currency?: string;
  exchange?: string;
  updatedAt: number;
  error?: string;
};

type ChartResponse = {
  chart?: {
    result?: Array<{
      meta?: {
        regularMarketPrice?: number;
        chartPreviousClose?: number;
        previousClose?: number;
        regularMarketDayHigh?: number;
        regularMarketDayLow?: number;
        regularMarketVolume?: number;
        currency?: string;
        exchangeName?: string;
      };
    }>;
  };
};

/** One attempt against a single host. Never throws — failures come back as `error`. */
async function attempt(host: string, symbol: string, updatedAt: number): Promise<Quote> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 9000);
  try {
    const response = await fetch(
      `${host}/${encodeURIComponent(`${symbol}.NS`)}?interval=1d&range=1d`,
      {
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          "User-Agent": "Mozilla/5.0 (compatible; PharmaExchangeGazette/1.0)",
        },
      },
    );

    if (!response.ok) {
      return { symbol, updatedAt, error: `HTTP ${response.status}` };
    }

    const body = (await response.json()) as ChartResponse;
    const meta = body.chart?.result?.[0]?.meta;
    const price = meta?.regularMarketPrice;

    if (!meta || typeof price !== "number") {
      return { symbol, updatedAt, error: "No quote returned" };
    }

    const previousClose = meta.chartPreviousClose ?? meta.previousClose;
    const hasClose = typeof previousClose === "number" && previousClose !== 0;

    return {
      symbol,
      price,
      previousClose,
      change: typeof previousClose === "number" ? price - previousClose : undefined,
      changePercent: hasClose ? ((price - previousClose) / previousClose) * 100 : undefined,
      dayHigh: meta.regularMarketDayHigh,
      dayLow: meta.regularMarketDayLow,
      volume: meta.regularMarketVolume,
      currency: meta.currency ?? "INR",
      // The feed reports NSE by its MIC code (NSI); print the familiar name.
      exchange: meta.exchangeName === "NSI" ? "NSE" : (meta.exchangeName ?? "NSE"),
      updatedAt,
      // Explicitly cleared so a recovered symbol stops showing a stale warning.
      error: undefined,
    };
  } catch (error) {
    const aborted = error instanceof Error && error.name === "AbortError";
    return { symbol, updatedAt, error: aborted ? "Timed out" : "Unreachable" };
  } finally {
    clearTimeout(timer);
  }
}

async function fetchQuote(symbol: string): Promise<Quote> {
  const updatedAt = Date.now();
  let last: Quote | null = null;

  for (const host of QUOTE_HOSTS) {
    const quote = await attempt(host, symbol, updatedAt);
    if (!quote.error) return quote;
    last = quote;
  }

  return last ?? { symbol, updatedAt, error: "Unreachable" };
}

/**
 * Pulls the latest price for every covered pharma company and caches it.
 *
 * Signed-in only: this makes outbound requests on the deployment's behalf, so
 * it should not be an open relay. The reading board itself stays public.
 */
export const refresh = action({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Sign in to refresh live market prices.");
    }

    const quotes: Quote[] = [];

    for (let i = 0; i < PHARMA_COMPANIES.length; i += BATCH_SIZE) {
      const batch = PHARMA_COMPANIES.slice(i, i + BATCH_SIZE);
      quotes.push(...(await Promise.all(batch.map((company) => fetchQuote(company.symbol)))));
    }

    await ctx.runMutation(internal.pharma.upsertQuotes, { quotes });

    const failed = quotes.filter((quote) => quote.error).length;
    return { updated: quotes.length - failed, failed, at: Date.now() };
  },
});
