import { v } from "convex/values";
import { internalMutation, query } from "./_generated/server";
import { PHARMA_COMPANIES } from "./pharmaData";

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

/**
 * The board: every covered company, joined with its most recent cached quote.
 *
 * Reactive — whenever the quote action writes new prices, subscribed readers
 * re-render with the fresh tape.
 */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const cached = await ctx.db.query("pharmaQuotes").collect();
    const bySymbol = new Map(cached.map((row) => [row.symbol, row]));

    const companies = PHARMA_COMPANIES.map((company) => {
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

    return { companies, quotesUpdatedAt };
  },
});

/** Writes a batch of freshly fetched quotes, patching existing rows in place. */
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
    }
  },
});
