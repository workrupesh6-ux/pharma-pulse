import { v } from "convex/values";
import { internalMutation, query, type QueryCtx } from "./_generated/server";
import { PHARMA_COMPANIES, type PharmaSector } from "./pharmaData";

/**
 * Resolves one ticker against the desk's roster: the synced NSE universe when
 * it exists, the curated seed otherwise. A row that the sync has retired is
 * gone for good, so a delisted ticker stops opening a page.
 */
async function resolveCompany(
  ctx: QueryCtx,
  symbol: string,
): Promise<{ symbol: string; name: string; sector: PharmaSector } | null> {
  const wanted = symbol.trim().toUpperCase();

  const stored = await ctx.db
    .query("pharmaUniverse")
    .withIndex("by_symbol", (q) => q.eq("symbol", wanted))
    .unique();

  if (stored) {
    return stored.active
      ? { symbol: stored.symbol, name: stored.name, sector: stored.sector }
      : null;
  }

  const seed = PHARMA_COMPANIES.find((entry) => entry.symbol === wanted);
  return seed
    ? { symbol: seed.symbol, name: seed.name, sector: seed.sector }
    : null;
}

/**
 * Everything the detail page needs for one ticker: the roster entry, its cached
 * live quote, cached key fundamentals, and cached recent headlines.
 *
 * Returns `null` for a symbol that is not on the roster, so the page can say so
 * instead of guessing.
 */
export const detail = query({
  args: { symbol: v.string() },
  handler: async (ctx, { symbol }) => {
    const company = await resolveCompany(ctx, symbol);
    if (!company) return null;

    const [quote, fundamentals, news, brief] = await Promise.all([
      ctx.db
        .query("pharmaQuotes")
        .withIndex("by_symbol", (q) => q.eq("symbol", company.symbol))
        .unique(),
      ctx.db
        .query("pharmaFundamentals")
        .withIndex("by_symbol", (q) => q.eq("symbol", company.symbol))
        .unique(),
      ctx.db
        .query("pharmaNews")
        .withIndex("by_symbol", (q) => q.eq("symbol", company.symbol))
        .unique(),
      ctx.db
        .query("pharmaBriefs")
        .withIndex("by_symbol", (q) => q.eq("symbol", company.symbol))
        .unique(),
    ]);

    return {
      company: {
        symbol: company.symbol,
        name: company.name,
        sector: company.sector,
      },
      quote: quote
        ? {
            price: quote.price ?? null,
            previousClose: quote.previousClose ?? null,
            change: quote.change ?? null,
            changePercent: quote.changePercent ?? null,
            dayHigh: quote.dayHigh ?? null,
            dayLow: quote.dayLow ?? null,
            volume: quote.volume ?? null,
            exchange: quote.exchange ?? null,
            currency: quote.currency ?? null,
            updatedAt: quote.updatedAt,
            error: quote.error ?? null,
          }
        : null,
      fundamentals: fundamentals
        ? {
            officialName: fundamentals.officialName ?? null,
            industry: fundamentals.industry ?? null,
            fiftyTwoWeekHigh: fundamentals.fiftyTwoWeekHigh ?? null,
            fiftyTwoWeekLow: fundamentals.fiftyTwoWeekLow ?? null,
            oneYearChangePercent: fundamentals.oneYearChangePercent ?? null,
            ytdChangePercent: fundamentals.ytdChangePercent ?? null,
            averageVolume30d: fundamentals.averageVolume30d ?? null,
            series: fundamentals.series ?? [],
            updatedAt: fundamentals.updatedAt,
            error: fundamentals.error ?? null,
          }
        : null,
      news: news
        ? {
            items: news.items,
            provider: news.provider ?? null,
            updatedAt: news.updatedAt,
            error: news.error ?? null,
          }
        : null,
      brief: brief
        ? {
            body: brief.body,
            model: brief.model ?? null,
            updatedAt: brief.updatedAt,
            error: brief.error ?? null,
          }
        : null,
    };
  },
});

export const upsertFundamentals = internalMutation({
  args: {
    symbol: v.string(),
    officialName: v.optional(v.string()),
    industry: v.optional(v.string()),
    fiftyTwoWeekHigh: v.optional(v.number()),
    fiftyTwoWeekLow: v.optional(v.number()),
    oneYearChangePercent: v.optional(v.number()),
    ytdChangePercent: v.optional(v.number()),
    averageVolume30d: v.optional(v.number()),
    series: v.optional(v.array(v.object({ t: v.number(), c: v.number() }))),
    updatedAt: v.number(),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("pharmaFundamentals")
      .withIndex("by_symbol", (q) => q.eq("symbol", args.symbol))
      .unique();

    if (existing) await ctx.db.patch(existing._id, args);
    else await ctx.db.insert("pharmaFundamentals", args);
  },
});

export const upsertNews = internalMutation({
  args: {
    symbol: v.string(),
    // Optional so a failed refresh can stamp the error without discarding the
    // headlines already on file.
    items: v.optional(
      v.array(
        v.object({
          title: v.string(),
          url: v.string(),
          source: v.string(),
          publishedAt: v.optional(v.number()),
        }),
      ),
    ),
    provider: v.optional(v.string()),
    updatedAt: v.number(),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("pharmaNews")
      .withIndex("by_symbol", (q) => q.eq("symbol", args.symbol))
      .unique();

    if (existing) await ctx.db.patch(existing._id, args);
    else await ctx.db.insert("pharmaNews", { ...args, items: args.items ?? [] });
  },
});

/** Stores the desk note. A failed write keeps the previous note on file. */
export const upsertBrief = internalMutation({
  args: {
    symbol: v.string(),
    body: v.optional(v.string()),
    model: v.optional(v.string()),
    updatedAt: v.number(),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("pharmaBriefs")
      .withIndex("by_symbol", (q) => q.eq("symbol", args.symbol))
      .unique();

    if (existing) await ctx.db.patch(existing._id, args);
    else {
      await ctx.db.insert("pharmaBriefs", { ...args, body: args.body ?? "" });
    }
  },
});
