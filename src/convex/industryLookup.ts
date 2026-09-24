/**
 * Industry cross-check for newly discovered roster candidates.
 *
 * Keyword matching on a registered name is a blunt instrument: "Rossari
 * Biotech" is a speciality-chemicals maker and "Ajooni Biotech" sells animal
 * feed, yet both read as biology. So before a discovered name is allowed onto
 * the desk it is looked up against the industry label the quote feed publishes
 * — the same `industry` field the detail page prints under Key Fundamentals —
 * and only the pharmaceutical ones survive.
 *
 * A failed lookup is not a rejection. The candidate keeps its place and is
 * re-checked on the next sweep, because dropping a real drug maker over one
 * bad request would be worse than carrying a doubtful one for a day.
 *
 * The query is pinned to the NSE ticker (`SYMBOL.NS`) and the answer has to
 * come back under that exact symbol. A bare symbol search is not safe here:
 * "KPL", "PAR" and "SPARC" all collide with unrelated foreign listings, and
 * judging an Indian drug maker by a US software company's industry label would
 * quietly drop it from the desk.
 */

const SEARCH_HOST = "https://query1.finance.yahoo.com/v1/finance/search";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const REQUEST_TIMEOUT_MS = 9_000;

export type IndustryVerdict = {
  /** The feed's own label, when it answered. */
  industry?: string;
  /** `null` when the lookup failed and the candidate should be re-checked. */
  isPharma: boolean | null;
};

/**
 * The feed files drug makers under one of two families — "Drug Manufacturers"
 * and "Biotechnology". Everything else it knows about health care is somebody
 * else's business: hospitals and care facilities, diagnostic labs, medical
 * devices and distributors.
 */
export function isPharmaIndustry(industry: string): boolean {
  const needle = industry.toLowerCase().replace(/[\u2010-\u2015]/g, "-");
  return needle.startsWith("drug manufacturers") || needle.startsWith("biotechnology");
}

export async function fetchIndustry(symbol: string): Promise<IndustryVerdict> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  const ticker = `${symbol}.NS`;

  try {
    const response = await fetch(
      `${SEARCH_HOST}?q=${encodeURIComponent(ticker)}&quotesCount=8&newsCount=0`,
      {
        signal: controller.signal,
        headers: { Accept: "application/json", "User-Agent": USER_AGENT },
      },
    );

    if (!response.ok) return { isPharma: null };

    const body = (await response.json()) as {
      quotes?: Array<{ symbol?: unknown; industry?: unknown }>;
    };

    // Only an exact NSE match counts; anything else is left unjudged.
    const quote = (body.quotes ?? []).find(
      (entry) =>
        typeof entry.symbol === "string" &&
        entry.symbol.toLowerCase() === ticker.toLowerCase(),
    );

    const industry = quote?.industry;
    if (typeof industry !== "string" || !industry.trim()) return { isPharma: null };

    return { industry, isPharma: isPharmaIndustry(industry) };
  } catch {
    return { isPharma: null };
  } finally {
    clearTimeout(timer);
  }
}
