import { v } from "convex/values";
import { internal } from "./_generated/api";
import { action, internalMutation, internalQuery } from "./_generated/server";
import { fetchEquityMaster } from "./nseMaster";
import { classifyListing } from "./pharmaTaxonomy";
import { fetchIndustry } from "./industryLookup";
import { fetchPharmaScreenings } from "./tvScreener";
import { PHARMA_COMPANIES, type PharmaSector } from "./pharmaData";
import { pharmaSectorValidator, pharmaSourceValidator } from "./schema";

/**
 * Coverage sync.
 *
 * The desk's roster is not written by hand. This action reads NSE's own equity
 * master — the exchange's published list of equity-series listings — keeps the
 * equity-series names, files the pharmaceutical ones onto a desk with the
 * classifier in pharmaTaxonomy.ts, confirms each newly discovered name against
 * the quote feed's industry label, and hands the whole roster to Convex in one
 * write. The curated list in pharmaData.ts is folded in as the seed, so nothing
 * already on the board can be dropped by a sweep.
 *
 * A name earns its place one of two ways. The preferred route is TradingView's
 * industry classification for the Indian market: a listing it files under
 * Pharmaceuticals or Biotechnology is a drug maker by someone else's judgement,
 * which is how the houses whose registered names carry no pharmaceutical word
 * at all get found — Cipla, Lupin, Biocon, Dr Reddy's. The fallback route is
 * the older one: a keyword in the registered name, plus the quote feed agreeing
 * the company is a drug maker rather than a hospital, a lab or a chemical
 * works. Either way the ruling is stored on the row, so a sweep only ever
 * judges what it has not judged before.
 *
 * A symbol is only trusted once the quote feed has answered for it: the roster
 * carries the row, and the next quote pass stamps `verifiedAt` on anything that
 * returns a real price. Names that vanish from the master are retired rather
 * than deleted, so their cached quotes and headlines stay readable.
 */

/**
 * Equity series the desk follows: EQ for the main board, BE for the Book Entry
 * names — which is where the exchange files companies such as Bliss GVS
 * Pharma. BZ is the trade-for-trade quarantine and is not a listing the desk
 * needs.
 */
const EQUITY_SERIES = new Set(["EQ", "BE"]);

/** Keeps the number of simultaneous industry lookups small. */
const LOOKUP_BATCH_SIZE = 8;

type RosterEntry = {
  symbol: string;
  name: string;
  sector: PharmaSector;
  source: "seed" | "nse-master" | "tradingview";
  isin?: string;
  listedAt?: number;
  /** The feed's industry label, once a discovered name has been ruled on. */
  industry?: string;
  /** False for a discovered name the industry check set aside. */
  active: boolean;
};

/**
 * Return types are spelled out rather than inferred: these handlers read and
 * write the generated API, and Convex's codegen cannot close that loop when the
 * type is left implicit.
 */
type SyncOutcome = {
  ok: boolean;
  error?: string;
  listingsScanned: number;
  equityListings: number;
  /** Equity listings whose registered name carried a pharmaceutical keyword. */
  matched: number;
  /** NSE pharma names read straight off TradingView's industry classification. */
  screened: number;
  /** Of those, the names the industry check set aside as not drug makers. */
  rejected: number;
  seeded: number;
  discovered: number;
  added: number;
  retired: number;
  updatedAt: number;
};

const rosterEntryValidator = v.object({
  symbol: v.string(),
  name: v.string(),
  sector: pharmaSectorValidator,
  source: pharmaSourceValidator,
  isin: v.optional(v.string()),
  listedAt: v.optional(v.number()),
  industry: v.optional(v.string()),
  active: v.boolean(),
});

export const sync = action({
  args: {},
  handler: async (ctx): Promise<SyncOutcome> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Sign in to sync the coverage list from the NSE equity master.");
    }

    const [master, screenings] = await Promise.all([fetchEquityMaster(), fetchPharmaScreenings()]);
    const updatedAt = Date.now();

    if (!master) {
      await ctx.runMutation(internal.universe.recordFailure, {
        error: "NSE equity master unreachable",
        updatedAt,
      });
      return {
        ok: false,
        error: "NSE equity master unreachable",
        listingsScanned: 0,
        equityListings: 0,
        matched: 0,
        screened: 0,
        rejected: 0,
        seeded: PHARMA_COMPANIES.length,
        discovered: 0,
        added: 0,
        retired: 0,
        updatedAt,
      };
    }

    const equityListings = master.filter((listing) => EQUITY_SERIES.has(listing.series));
    const bySymbol = new Map(equityListings.map((listing) => [listing.symbol, listing]));

    const entries: RosterEntry[] = [];
    const seen = new Set<string>();

    // The curated seed goes on first and is never filtered.
    for (const company of PHARMA_COMPANIES) {
      const listing = bySymbol.get(company.symbol);
      entries.push({
        symbol: company.symbol,
        name: company.name,
        sector: company.sector,
        source: "seed",
        // A seed name found in the master is a listing NSE itself confirms.
        isin: listing?.isin,
        listedAt: listing?.listedAt,
        active: true,
      });
      seen.add(company.symbol);
    }

    // TradingView's industry screen goes on next, and only for symbols the
    // exchange itself lists as equity. The division of labour is deliberate:
    // the screen is authoritative about what a company does, the master is
    // authoritative about whether NSE trades it, and a name that fails the
    // second test has no quote feed to read anyway. A screened name needs no
    // further cross-check — a real industry label is exactly what the keyword
    // route was trying to approximate.
    let screened = 0;
    if (screenings) {
      for (const row of screenings) {
        const listing = bySymbol.get(row.symbol);
        if (!listing || seen.has(row.symbol)) continue;

        seen.add(row.symbol);
        screened += 1;
        entries.push({
          symbol: row.symbol,
          name: row.name,
          sector: row.sector,
          source: "tradingview",
          isin: listing.isin,
          listedAt: listing.listedAt,
          industry: row.industry,
          active: true,
        });
      }
    }

    const candidates: { listing: (typeof equityListings)[number]; sector: PharmaSector }[] = [];
    for (const listing of equityListings) {
      const sector = classifyListing(listing.name);
      if (!sector || seen.has(listing.symbol)) continue;

      seen.add(listing.symbol);
      candidates.push({ listing, sector });
    }

    const checked = await ctx.runQuery(internal.universe.checkedCandidates, {});
    const rulings = new Map(checked.map((row) => [row.symbol, row]));

    let rejected = 0;

    for (let i = 0; i < candidates.length; i += LOOKUP_BATCH_SIZE) {
      const batch = candidates.slice(i, i + LOOKUP_BATCH_SIZE);

      const judged = await Promise.all(
        batch.map(async ({ listing, sector }) => {
          // Already ruled on by an earlier sweep: reuse the verdict instead of
          // asking the feed the same question again.
          const known = rulings.get(listing.symbol);
          if (known) {
            return { listing, sector, industry: known.industry, active: known.active };
          }

          const verdict = await fetchIndustry(listing.symbol);

          // A failed lookup keeps the candidate and leaves it unjudged, so the
          // next sweep asks again rather than dropping a real drug maker.
          if (verdict.isPharma === null) {
            return { listing, sector, industry: undefined, active: true };
          }

          return { listing, sector, industry: verdict.industry, active: verdict.isPharma };
        }),
      );

      for (const { listing, sector, industry, active } of judged) {
        if (!active) rejected += 1;
        entries.push({
          symbol: listing.symbol,
          name: listing.name,
          sector,
          source: "nse-master",
          isin: listing.isin,
          listedAt: listing.listedAt,
          industry,
          active,
        });
      }
    }

    const seeded = PHARMA_COMPANIES.length;
    const discovered = entries.filter(
      (entry) => entry.source !== "seed" && entry.active,
    ).length;
    const matched = candidates.length;

    const { added, retired } = await ctx.runMutation(internal.universe.replaceRoster, {
      entries,
      listingsScanned: master.length,
      equityListings: equityListings.length,
      matched,
      screened,
      rejected,
      seeded,
      discovered,
      updatedAt,
    });

    return {
      ok: true,
      listingsScanned: master.length,
      equityListings: equityListings.length,
      matched,
      screened,
      rejected,
      seeded,
      discovered,
      added,
      retired,
      updatedAt,
    };
  },
});

/**
 * Every discovered name the industry check has already judged, so a sweep only
 * looks up what it has not seen before.
 */
export const checkedCandidates = internalQuery({
  args: {},
  handler: async (
    ctx,
  ): Promise<{ symbol: string; industry: string; active: boolean }[]> => {
    const rows = await ctx.db.query("pharmaUniverse").collect();

    return rows
      .filter(
        (row): row is typeof row & { industry: string } =>
          row.source === "nse-master" && typeof row.industry === "string",
      )
      .map((row) => ({ symbol: row.symbol, industry: row.industry, active: row.active }));
  },
});

/**
 * Swaps the roster for a freshly synced one. Rows are patched in place so the
 * `verifiedAt` stamp survives a re-sync, and symbols that the master no longer
 * lists are deactivated instead of deleted.
 */
export const replaceRoster = internalMutation({
  args: {
    entries: v.array(rosterEntryValidator),
    listingsScanned: v.number(),
    equityListings: v.number(),
    matched: v.number(),
    screened: v.number(),
    rejected: v.number(),
    seeded: v.number(),
    discovered: v.number(),
    updatedAt: v.number(),
  },
  handler: async (ctx, args): Promise<{ added: number; retired: number }> => {
    const existing = await ctx.db.query("pharmaUniverse").collect();
    const rows = new Map(existing.map((row) => [row.symbol, row]));
    const keep = new Set<string>();
    let added = 0;

    for (const entry of args.entries) {
      keep.add(entry.symbol);
      const row = rows.get(entry.symbol);

      if (row) {
        await ctx.db.patch(row._id, {
          name: entry.name,
          sector: entry.sector,
          source: entry.source,
          isin: entry.isin,
          listedAt: entry.listedAt,
          industry: entry.industry,
          active: entry.active,
          updatedAt: args.updatedAt,
        });
      } else {
        await ctx.db.insert("pharmaUniverse", {
          symbol: entry.symbol,
          name: entry.name,
          sector: entry.sector,
          source: entry.source,
          isin: entry.isin,
          listedAt: entry.listedAt,
          industry: entry.industry,
          active: entry.active,
          updatedAt: args.updatedAt,
        });
        added += 1;
      }
    }

    let retired = 0;
    for (const row of existing) {
      if (keep.has(row.symbol) || !row.active) continue;
      await ctx.db.patch(row._id, { active: false, updatedAt: args.updatedAt });
      retired += 1;
    }

    await ctx.db.insert("pharmaCoverage", {
      listingsScanned: args.listingsScanned,
      equityListings: args.equityListings,
      matched: args.matched,
      screened: args.screened,
      rejected: args.rejected,
      seeded: args.seeded,
      discovered: args.discovered,
      added,
      retired,
      ok: true,
      updatedAt: args.updatedAt,
    });

    return { added, retired };
  },
});

/** Records a failed sweep so the board can say the roster is stale, not empty. */
export const recordFailure = internalMutation({
  args: { error: v.string(), updatedAt: v.number() },
  handler: async (ctx, { error, updatedAt }): Promise<void> => {
    await ctx.db.insert("pharmaCoverage", {
      listingsScanned: 0,
      equityListings: 0,
      matched: 0,
      screened: 0,
      rejected: 0,
      seeded: PHARMA_COMPANIES.length,
      discovered: 0,
      added: 0,
      retired: 0,
      ok: false,
      error,
      updatedAt,
    });
  },
});
