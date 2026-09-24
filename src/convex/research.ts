import { v } from "convex/values";
import { internal } from "./_generated/api";
import { action, type ActionCtx } from "./_generated/server";
import type { PharmaSector } from "./pharmaData";

/**
 * On-demand research for a single ticker.
 *
 * Fundamentals are derived from a year of real price history: the 52-week range,
 * trailing one-year and year-to-date returns, a 30-day average volume and a
 * downsampled close series for the chart. Headlines come from public news feeds
 * scoped to India. Nothing here is estimated or invented — a field is omitted
 * when the upstream feed does not supply it.
 */
const QUOTE_HOSTS = [
  "https://query1.finance.yahoo.com/v8/finance/chart",
  "https://query2.finance.yahoo.com/v8/finance/chart",
];

/**
 * A full browser user agent. Public feeds routinely reject obvious bot
 * identifiers such as `compatible; .../1.0` with a 5xx.
 */
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const RSS_ACCEPT = "application/rss+xml, application/xml, text/xml";
const NEWS_LIMIT = 8;
const MAX_SERIES_POINTS = 60;
const MAX_TITLE_LENGTH = 300;

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/** Calendar year on the IST clock, without relying on Intl in the isolate. */
function istYear(at: number): number {
  return new Date(at + IST_OFFSET_MS).getUTCFullYear();
}

async function fetchWithTimeout(url: string, accept: string, ms: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: { Accept: accept, "User-Agent": USER_AGENT },
    });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Looks a ticker up on the live roster — the synced NSE universe, or the
 * curated seed before the first sync.
 */
async function resolveCompany(
  ctx: ActionCtx,
  symbol: string,
): Promise<{ symbol: string; name: string; sector: PharmaSector }> {
  const wanted = symbol.trim().toUpperCase();
  const roster: { symbol: string; name: string; sector: PharmaSector }[] = await ctx.runQuery(
    internal.pharma.roster,
    {},
  );
  const company = roster.find((entry) => entry.symbol === wanted);
  if (!company) throw new Error(`Unknown ticker: ${symbol}`);
  return company;
}

/** Keeps the stored chart series small enough for a document. */
function downsample<T>(items: T[], target: number): T[] {
  if (items.length <= target) return items;
  const step = items.length / target;
  const out: T[] = [];
  for (let i = 0; i < target; i += 1) out.push(items[Math.floor(i * step)]);
  const last = items[items.length - 1];
  if (out[out.length - 1] !== last) out.push(last);
  return out;
}

type YearChart = {
  price?: number;
  yearAgoClose?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  officialName?: string;
  points: { t: number; c: number }[];
  volumes: number[];
};

async function fetchYearChart(symbol: string): Promise<YearChart | null> {
  const path = `${encodeURIComponent(`${symbol}.NS`)}?interval=1d&range=1y`;

  for (const host of QUOTE_HOSTS) {
    try {
      const response = await fetchWithTimeout(`${host}/${path}`, "application/json", 12000);
      if (!response.ok) continue;

      const body = (await response.json()) as {
        chart?: {
          result?: Array<{
            meta?: Record<string, unknown>;
            timestamp?: number[];
            indicators?: {
              quote?: Array<{ close?: (number | null)[]; volume?: (number | null)[] }>;
            };
          }>;
        };
      };

      const result = body.chart?.result?.[0];
      if (!result?.meta) continue;

      const meta = result.meta;
      const asNumber = (key: string) =>
        typeof meta[key] === "number" ? (meta[key] as number) : undefined;

      const quote = result.indicators?.quote?.[0] ?? {};
      const closes = quote.close ?? [];
      const timestamps = result.timestamp ?? [];

      const points: { t: number; c: number }[] = [];
      for (let i = 0; i < timestamps.length; i += 1) {
        const close = closes[i];
        if (typeof close === "number") points.push({ t: timestamps[i] * 1000, c: close });
      }

      return {
        price: asNumber("regularMarketPrice"),
        yearAgoClose: asNumber("chartPreviousClose"),
        fiftyTwoWeekHigh: asNumber("fiftyTwoWeekHigh"),
        fiftyTwoWeekLow: asNumber("fiftyTwoWeekLow"),
        officialName:
          typeof meta.longName === "string"
            ? meta.longName
            : typeof meta.shortName === "string"
              ? meta.shortName
              : undefined,
        points,
        volumes: (quote.volume ?? []).filter((value): value is number => typeof value === "number"),
      };
    } catch {
      // Try the next host.
    }
  }

  return null;
}

/** Best-effort industry classification; a miss simply leaves the field out. */
async function fetchClassification(
  symbol: string,
): Promise<{ industry?: string; officialName?: string }> {
  try {
    // Pinned to the NSE ticker: a bare symbol search collides with unrelated
    // foreign listings (KPL, PAR and SPARC all resolve to US companies), which
    // would print the wrong industry on the detail page.
    const ticker = `${symbol}.NS`;
    const response = await fetchWithTimeout(
      `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(ticker)}&quotesCount=8&newsCount=0`,
      "application/json",
      9000,
    );
    if (!response.ok) return {};

    const body = (await response.json()) as {
      quotes?: Array<{ symbol?: unknown; industry?: unknown; longname?: unknown }>;
    };
    const quote = (body.quotes ?? []).find(
      (entry) =>
        typeof entry.symbol === "string" &&
        entry.symbol.toLowerCase() === ticker.toLowerCase(),
    );
    if (!quote) return {};

    return {
      industry: typeof quote.industry === "string" ? quote.industry : undefined,
      officialName: typeof quote.longname === "string" ? quote.longname : undefined,
    };
  } catch {
    return {};
  }
}

export const refreshFundamentals = action({
  args: { symbol: v.string() },
  handler: async (ctx, { symbol }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Sign in to load key fundamentals.");

    const company = await resolveCompany(ctx, symbol);
    const updatedAt = Date.now();
    const [chart, classification] = await Promise.all([
      fetchYearChart(company.symbol),
      fetchClassification(company.symbol),
    ]);

    if (!chart) {
      await ctx.runMutation(internal.stock.upsertFundamentals, {
        symbol: company.symbol,
        updatedAt,
        error: "Price history unavailable",
      });
      return { ok: false };
    }

    const closes = chart.points.map((point) => point.c);
    const price = chart.price ?? (closes.length > 0 ? closes[closes.length - 1] : undefined);

    const high = chart.fiftyTwoWeekHigh ?? (closes.length > 0 ? Math.max(...closes) : undefined);
    const low = chart.fiftyTwoWeekLow ?? (closes.length > 0 ? Math.min(...closes) : undefined);

    const oneYearChangePercent =
      price !== undefined && chart.yearAgoClose
        ? (price / chart.yearAgoClose - 1) * 100
        : undefined;

    const year = istYear(updatedAt);
    const ytdAnchor = chart.points.find((point) => istYear(point.t) === year);
    const ytdChangePercent =
      price !== undefined && ytdAnchor && ytdAnchor.c !== 0
        ? (price / ytdAnchor.c - 1) * 100
        : undefined;

    const recentVolumes = chart.volumes.slice(-30);
    const averageVolume30d =
      recentVolumes.length > 0
        ? recentVolumes.reduce((total, value) => total + value, 0) / recentVolumes.length
        : undefined;

    await ctx.runMutation(internal.stock.upsertFundamentals, {
      symbol: company.symbol,
      officialName: classification.officialName ?? chart.officialName,
      industry: classification.industry,
      fiftyTwoWeekHigh: high,
      fiftyTwoWeekLow: low,
      oneYearChangePercent,
      ytdChangePercent,
      averageVolume30d,
      series: downsample(chart.points, MAX_SERIES_POINTS),
      updatedAt,
      error: undefined,
    });

    return { ok: true, points: chart.points.length };
  },
});

/* -------------------------------------------------------------------------
   Headlines
   ------------------------------------------------------------------------- */

type NewsItem = { title: string; url: string; source: string; publishedAt?: number };

function decodeEntities(input: string): string {
  return input
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#8217;/g, "\u2019")
    .replace(/&#8216;/g, "\u2018")
    .replace(/&#8220;/g, "\u201C")
    .replace(/&#8221;/g, "\u201D")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
}

function cleanText(input: string | null): string {
  if (!input) return "";
  return decodeEntities(input.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1"))
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function firstTag(block: string, tag: string): string | null {
  const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
  return match ? match[1] : null;
}

/** Bing wraps the publisher URL in a `url=` parameter; unwrap it. */
function unwrapBingLink(link: string): string {
  const match = link.match(/[?&]url=([^&]+)/);
  if (!match) return link;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return link;
  }
}

type FeedShape = {
  /** Publisher tag: plain `<source>` on Google, namespaced on Bing. */
  sourceTag: string;
  unwrapLink: (link: string) => string;
};

/** Minimal RSS reader — the item shape on these feeds is stable enough for this. */
function parseFeed(xml: string, shape: FeedShape): NewsItem[] {
  const blocks = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];
  const items: NewsItem[] = [];
  const seen = new Set<string>();

  for (const block of blocks) {
    const rawTitle = firstTag(block, "title");
    const rawLink = firstTag(block, "link");
    if (!rawTitle || !rawLink) continue;

    const source = cleanText(firstTag(block, shape.sourceTag));
    let title = cleanText(rawTitle);
    if (!title) continue;

    // Google ends each title with " - Publisher"; the publisher prints below it.
    if (source) {
      for (const dash of [" - ", " \u2013 ", " \u2014 "]) {
        const suffix = `${dash}${source}`;
        if (title.endsWith(suffix)) {
          title = title.slice(0, title.length - suffix.length).trim();
          break;
        }
      }
    }

    const url = shape.unwrapLink(cleanText(rawLink));
    if (!url || seen.has(url)) continue;
    seen.add(url);

    const rawDate = cleanText(firstTag(block, "pubDate"));
    const parsedDate = rawDate ? Date.parse(rawDate) : Number.NaN;

    items.push({
      title: title.slice(0, MAX_TITLE_LENGTH),
      url,
      source: source || "Newswire",
      publishedAt: Number.isNaN(parsedDate) ? undefined : parsedDate,
    });
  }

  return items;
}

type NewsProvider = {
  name: string;
  url: (query: string) => string;
  parse: (xml: string) => NewsItem[];
};

/**
 * Google News gives the best Indian coverage but returns 503 for some
 * datacenter IP ranges, which is exactly where a hosted app runs from. Bing's
 * news feed is tried next, and links are unwrapped to the original publisher.
 */
const NEWS_PROVIDERS: NewsProvider[] = [
  {
    name: "google-news",
    url: (query) =>
      `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-IN&gl=IN&ceid=IN:en`,
    parse: (xml) => parseFeed(xml, { sourceTag: "source", unwrapLink: (link) => link }),
  },
  {
    name: "bing-news",
    url: (query) =>
      `https://www.bing.com/news/search?q=${encodeURIComponent(query)}&format=RSS&setmkt=en-IN&setlang=en`,
    parse: (xml) => parseFeed(xml, { sourceTag: "News:Source", unwrapLink: unwrapBingLink }),
  },
];

export const refreshNews = action({
  args: { symbol: v.string() },
  handler: async (ctx, { symbol }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Sign in to load headlines.");

    const company = await resolveCompany(ctx, symbol);
    const updatedAt = Date.now();
    const query = `${company.name} share`;

    let lastError: string | null = null;

    for (const provider of NEWS_PROVIDERS) {
      try {
        const response = await fetchWithTimeout(provider.url(query), RSS_ACCEPT, 12000);

        if (!response.ok) {
          lastError = `${provider.name}: HTTP ${response.status}`;
          continue;
        }

        const items = provider.parse(await response.text()).slice(0, NEWS_LIMIT);
        if (items.length === 0) {
          lastError = `${provider.name}: feed returned no items`;
          continue;
        }

        await ctx.runMutation(internal.stock.upsertNews, {
          symbol: company.symbol,
          items,
          provider: provider.name,
          updatedAt,
          error: undefined,
        });
        return { ok: true, count: items.length, provider: provider.name };
      } catch (error) {
        lastError = `${provider.name}: ${
          error instanceof Error ? error.message : "request failed"
        }`;
      }
    }

    // Every source failed — keep any headlines already on file.
    await ctx.runMutation(internal.stock.upsertNews, {
      symbol: company.symbol,
      updatedAt,
      error: lastError ?? "No news source reachable",
    });
    return { ok: false };
  },
});
