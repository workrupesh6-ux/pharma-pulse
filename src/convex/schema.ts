import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";

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

    // Latest cached live quote per NSE-listed pharma company. The roster of
    // companies lives in code (src/convex/pharmaData.ts); this table only
    // stores the price tape fetched by the quote action.
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
  },
  {
    schemaValidation: false,
  },
);

export default schema;
