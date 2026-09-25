import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";
import { PHARMA_SECTORS } from "./pharmaData";

/**
 * The five desks a company can be filed under. Built from the roster's own
 * list so a new desk can never be added in one place and forgotten here.
 */
export const pharmaSectorValidator = v.union(
  v.literal(PHARMA_SECTORS[0]),
  v.literal(PHARMA_SECTORS[1]),
  v.literal(PHARMA_SECTORS[2]),
  v.literal(PHARMA_SECTORS[3]),
  v.literal(PHARMA_SECTORS[4]),
);

export const pharmaSourceValidator = v.union(
  v.literal("seed"),
  v.literal("nse-master"),
  v.literal("tradingview"),
);

// default user roles. can add / remove based on the project as needed
export const ROLES = {
  ADMIN: "admin",
  USER: "user",
  MEMBER: "member",
} as const;

export const roleValidator = v.union(
  v.literal(ROLES.ADMIN),
  v.literal(ROLES.USER),
  v.literal(ROLES.MEMBER),
);
export type Role = Infer<typeof roleValidator>;

const schema = defineSchema(
  {
    // default auth tables using convex auth.
    ...authTables, // do not remove or modify

    // the users table is the default users table that is brought in by the authTables
    users: defineTable({
      name: v.optional(v.string()), // name of the user. do not remove
      image: v.optional(v.string()), // image of the user. do not remove
      email: v.optional(v.string()), // email of the user. do not remove
      emailVerificationTime: v.optional(v.number()), // email verification time. do not remove
      isAnonymous: v.optional(v.boolean()), // is the user anonymous. do not remove

      role: v.optional(roleValidator), // role of the user. do not remove
    }).index("email", ["email"]), // index for the email. do not remove or modify

    // The desk's coverage roster.
    //
    // Populated by the NSE equity-master sync (src/convex/universe.ts). The
    // curated list in src/convex/pharmaData.ts is the seed — it is always kept,
    // and it is the fallback whenever this table is empty, so the board works
    // before the first sync has ever run.
    pharmaUniverse: defineTable({
      symbol: v.string(),
      name: v.string(),
      sector: pharmaSectorValidator,
      /**
       * Where the row came from: the curated seed, a keyword match on the NSE
       * master file, or TradingView's industry screen.
       */
      source: pharmaSourceValidator,
      isin: v.optional(v.string()),
      /** Listing date from the master file, epoch ms. */
      listedAt: v.optional(v.number()),
      /**
       * The industry label recorded when the name was judged — from the
       * screener for a screened name, from the quote feed for a keyword match.
       * Its presence is also the memo that says "do not look this one up
       * again".
       */
      industry: v.optional(v.string()),
      /** Set once the quote feed has returned a real price for this symbol. */
      verifiedAt: v.optional(v.number()),
      /** False once a symbol no longer appears in the master file. */
      active: v.boolean(),
      updatedAt: v.number(),
    })
      .index("by_symbol", ["symbol"])
      .index("by_active", ["active"]),

    // One row per coverage sync, so the board can print how wide the sweep was
    // and whether the last attempt failed.
    pharmaCoverage: defineTable({
      /** Every row in the NSE equity master that was read. */
      listingsScanned: v.number(),
      /** Of those, the equity-series (EQ and BE) listings. */
      equityListings: v.number(),
      /** Listings whose registered name carried a pharmaceutical keyword. */
      matched: v.number(),
      /** NSE names read straight off TradingView's industry classification. */
      screened: v.number(),
      /** Of those, the names the industry check set aside as not drug makers. */
      rejected: v.number(),
      /** Curated seed names carried onto the roster. */
      seeded: v.number(),
      /** Matched names that were not already on the seed list. */
      discovered: v.number(),
      added: v.number(),
      retired: v.number(),
      ok: v.boolean(),
      error: v.optional(v.string()),
      updatedAt: v.number(),
    }),

    // Latest cached live quote per NSE-listed pharma company. The roster of
    // companies lives in pharmaUniverse above; this table only stores the price
    // tape fetched by the quote action.
    pharmaQuotes: defineTable({
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
    }).index("by_symbol", ["symbol"]),

    // Key fundamentals per company, derived from a year of price history plus
    // the feed's industry classification. Fetched on demand from the detail page.
    pharmaFundamentals: defineTable({
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
    }).index("by_symbol", ["symbol"]),

    // Recent headlines per company, read from a public news feed.
    pharmaNews: defineTable({
      symbol: v.string(),
      items: v.array(
        v.object({
          title: v.string(),
          url: v.string(),
          source: v.string(),
          publishedAt: v.optional(v.number()),
        }),
      ),
      // Which feed these came from, so the provenance stays visible.
      provider: v.optional(v.string()),
      updatedAt: v.number(),
      error: v.optional(v.string()),
    }).index("by_symbol", ["symbol"]),

    // The desk note: a short Gemini-written read of one company's own quote,
    // fundamentals and headlines. Written on demand and cached, so a page view
    // never costs a model call unless the note is missing or stale.
    pharmaBriefs: defineTable({
      symbol: v.string(),
      /** Light markdown: paragraphs, "- " bullets and **bold** spans. */
      body: v.string(),
      /** Which model wrote it, printed beside the note. */
      model: v.optional(v.string()),
      updatedAt: v.number(),
      error: v.optional(v.string()),
    }).index("by_symbol", ["symbol"]),
  },
  {
    schemaValidation: false,
  },
);

export default schema;
