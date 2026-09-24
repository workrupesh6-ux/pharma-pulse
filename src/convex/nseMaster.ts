/**
 * Reader for NSE's own equity master file.
 *
 * `EQUITY_L.csv` is the exchange's published list of equity-series listings:
 * every company currently traded on the NSE main board, with its symbol, ISIN
 * and listing date. It is a static file on NSE's archive host — no key, no
 * session handshake, no scraping of a rendered page — which is what makes it
 * usable from a scheduled job and why it is the desk's coverage source.
 *
 * The file is a plain CSV with one quirk: the header pads some column names
 * with a leading space, so columns are read positionally rather than by name.
 */

const MASTER_URLS = [
  "https://nsearchives.nseindia.com/content/equities/EQUITY_L.csv",
  "https://archives.nseindia.com/content/equities/EQUITY_L.csv",
];

/**
 * A realistic browser agent. The archive host serves the file happily, but
 * rejects obvious bot identifiers with an empty response.
 */
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const REQUEST_TIMEOUT_MS = 15_000;

/** Column offsets in EQUITY_L.csv. */
const COL = { symbol: 0, name: 1, series: 2, listedAt: 3, isin: 6 } as const;

const MONTHS: Record<string, number> = {
  JAN: 0,
  FEB: 1,
  MAR: 2,
  APR: 3,
  MAY: 4,
  JUN: 5,
  JUL: 6,
  AUG: 7,
  SEP: 8,
  OCT: 9,
  NOV: 10,
  DEC: 11,
};

export type MasterListing = {
  symbol: string;
  name: string;
  series: string;
  isin?: string;
  listedAt?: number;
};

/** Splits one CSV line, honouring quoted fields and doubled quotes. */
function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (quoted) {
      if (char !== '"') {
        cell += char;
      } else if (line[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else {
        quoted = false;
      }
      continue;
    }

    if (char === '"') quoted = true;
    else if (char === ",") {
      cells.push(cell);
      cell = "";
    } else cell += char;
  }

  cells.push(cell);
  return cells;
}

/** `06-OCT-2008` → epoch ms, or `undefined` for anything unexpected. */
function parseListingDate(value: string): number | undefined {
  const match = value.trim().match(/^(\d{1,2})-([A-Z]{3})-(\d{4})$/i);
  if (!match) return undefined;

  const day = Number(match[1]);
  const month = MONTHS[match[2].toUpperCase()];
  const year = Number(match[3]);
  if (month === undefined || !day || !year) return undefined;

  return Date.UTC(year, month, day);
}

function parseMaster(csv: string): MasterListing[] {
  const listings: MasterListing[] = [];
  const lines = csv.split(/\r?\n/);

  // The first line is the header.
  for (let i = 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line.trim()) continue;

    const cells = splitCsvLine(line);
    const symbol = cells[COL.symbol]?.trim().toUpperCase();
    const name = cells[COL.name]?.trim();

    if (!symbol || !name) continue;

    listings.push({
      symbol,
      name,
      series: cells[COL.series]?.trim().toUpperCase() ?? "",
      isin: cells[COL.isin]?.trim() || undefined,
      listedAt: parseListingDate(cells[COL.listedAt] ?? ""),
    });
  }

  return listings;
}

/**
 * Reads the equity master, trying each archive host in turn. Returns `null`
 * only when none of them answered with a usable file.
 */
export async function fetchEquityMaster(): Promise<MasterListing[] | null> {
  for (const url of MASTER_URLS) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          Accept: "text/csv,*/*",
          "User-Agent": USER_AGENT,
        },
      });

      if (!response.ok) continue;

      const listings = parseMaster(await response.text());
      if (listings.length > 0) return listings;
    } catch {
      // Try the next host.
    } finally {
      clearTimeout(timer);
    }
  }

  return null;
}
