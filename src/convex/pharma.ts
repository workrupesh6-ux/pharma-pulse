import { v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  query,
  type QueryCtx,
} from "./_generated/server";
import { PHARMA_COMPANIES } from "./pharmaData";
import type { PharmaSector } from "./pharmaData";

/**
 * A cached live quote. Every field except `symbol` and `updatedAt` is optional
 * so a failed fetch can record its error without wiping the last good price.
 */
const quoteValidator = v.object({
  symbol: v.string(),
  price: v.optional(v.number()),
  previousClose: v.optional(v.number()),
  change: v.optional(v.number()),
  changePercent: v.optional(v.number()),
  dayHigh: v.optional(v.number()),
  dayLow: v.optional(v.number()),
  volume: v.optional(v.number()),
  currency: v.optional(v.string()),
  exchange: v.optional(v.string()),
  updatedAt: v.number(),
  error: v.optional(v.string()),
});

export type RosterEntry = {
  symbol: string;
  name: string;
  sector: PharmaSector;
};

/**
 * The desks's roster: the synced NSE universe when one exists, otherwise the
 * curated seed list. Every reader and writer goes through here, so the quote
 * action, the detail page and the board can never disagree about who is on the
 * board.
 */
async function loadRoster(ctx: QueryCtx): Promise<RosterEntry[]> {
  const stored = await ctx.db.query("pharmaUniverse").collect();
  const active = stored.filter((row) => row.active);

  if (active.length > 0) {
    return active.map((row) => ({
      symbol: row.symbol,
      name: row.name,
      sector: row.sector,
    }));
  }

  return PHARMA_COMPANIES.map((company) => ({
    symbol: company.symbol,
    name: company.name,
    sector: company.sector,
  }));
}

/** The roster as the actions see it. */
export const roster = internalQuery({
  args: {},
  handler: async (ctx): Promise<RosterEntry[]> => loadRoster(ctx),
});

/** The most recent coverage sweep, or null before the first one. */
async function loadCoverage(ctx: QueryCtx) {
  const row = await ctx.db.query("pharmaCoverage").order("desc").first();
  if (!row) return null;

  return {
    listingsScanned: row.listingsScanned,
    equityListings: row.equityListings,
    matched: row.matched,
    screened: row.screened ?? 0,
    rejected: row.rejected ?? 0,
    seeded: row.seeded,
    discovered: row.discovered,
    added: row.added,
    retired: row.retired,
    ok: row.ok,
    error: row.error ?? null,
    updatedAt: row.updatedAt,
  };
}

/**
 * The board: every covered company, joined with its most recent cached quote.
 *
 * Reactive — whenever the quote action writes new prices or the coverage sync
 * swaps the roster, subscribed readers re-render with the fresh tape.
 */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const [roster, cached, coverage] = await Promise.all([
      loadRoster(ctx),
      ctx.db.query("pharmaQuotes").collect(),
      loadCoverage(ctx),
    ]);

    const bySymbol = new Map(cached.map((row) => [row.symbol, row]));

    const companies = roster.map((company) => {
      const quote = bySymbol.get(company.symbol);
      return {
        symbol: company.symbol,
        name: company.name,
        sector: company.sector,
        price: quote?.price ?? null,
        previousClose: quote?.previousClose ?? null,
        change: quote?.change ?? null,
        changePercent: quote?.changePercent ?? null,
        dayHigh: quote?.dayHigh ?? null,
        dayLow: quote?.dayLow ?? null,
        volume: quote?.volume ?? null,
        exchange: quote?.exchange ?? null,
        updatedAt: quote?.updatedAt ?? null,
        error: quote?.error ?? null,
      };
    });

    let quotesUpdatedAt: number | null = null;
    for (const quote of cached) {
      if (quotesUpdatedAt === null || quote.updatedAt > quotesUpdatedAt) {
        quotesUpdatedAt = quote.updatedAt;
      }
    }

    return {
      companies,
      quotesUpdatedAt,
      coverage,
      /** `seed` until a coverage sync has populated the roster table. */
      rosterSource: coverage ? ("nse-master" as const) : ("seed" as const),
    };
  },
});

/**
 * The next slice of the roster to re-read.
 *
 * The desk covers every listed pharma name, so no single pass can re-quote the
 * whole shelf inside one action without holding the connection open far too
 * long. Instead the caller asks for the stalest `limit` symbols — never-quoted
 * names first, then the oldest reads — so successive cycles sweep the entire
 * board and a single slow ticker can never starve the rest.
 */
export const stalestSymbols = internalQuery({
  args: { limit: v.number() },
  handler: async (ctx, { limit }) => {
    const [roster, cached] = await Promise.all([
      loadRoster(ctx),
      ctx.db.query("pharmaQuotes").collect(),
    ]);

    const lastRead = new Map(cached.map((row) => [row.symbol, row.updatedAt]));

    return roster
      .map((company) => ({
        symbol: company.symbol,
        updatedAt: lastRead.get(company.symbol) ?? Number.NEGATIVE_INFINITY,
      }))
      .sort((a, b) => a.updatedAt - b.updatedAt)
      .slice(0, limit)
      .map((entry) => ({ symbol: entry.symbol }));
  },
});

/**
 * Writes a batch of freshly fetched quotes, patching existing rows in place.
 *
 * A quote that came back with a real price also stamps the roster row, which is
 * how a newly discovered symbol earns its place: the master file says it is
 * listed, the feed says it is tradable.
 */
export const upsertQuotes = internalMutation({
  args: { quotes: v.array(quoteValidator) },
  handler: async (ctx, { quotes }) => {
    for (const quote of quotes) {
      const existing = await ctx.db
        .query("pharmaQuotes")
        .withIndex("by_symbol", (q) => q.eq("symbol", quote.symbol))
        .unique();

      if (existing) {
        await ctx.db.patch(existing._id, quote);
      } else {
        await ctx.db.insert("pharmaQuotes", quote);
      }

      if (!quote.error) {
        const row = await ctx.db
          .query("pharmaUniverse")
          .withIndex("by_symbol", (q) => q.eq("symbol", quote.symbol))
          .unique();

        if (row) {
          await ctx.db.patch(row._id, { verifiedAt: quote.updatedAt, active: true });
        }
      }
    }
  },
});
