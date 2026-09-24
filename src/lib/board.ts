import { api } from "@/convex/_generated/api";
import type { FunctionReturnType } from "convex/server";
import { PHARMA_SECTORS } from "@/convex/pharmaData";

/** The full reading board as returned by the reactive Convex query. */
export type Board = FunctionReturnType<typeof api.pharma.list>;
export type BoardRow = Board["companies"][number];

export type MarketSummary = {
  quoted: number;
  advancing: number;
  declining: number;
  unchanged: number;
  topGainer: BoardRow | null;
  topLoser: BoardRow | null;
};

/** Market breadth across the covered pharma shelf. */
export function summarize(companies: BoardRow[]): MarketSummary {
  let quoted = 0;
  let advancing = 0;
  let declining = 0;
  let unchanged = 0;
  let topGainer: BoardRow | null = null;
  let topLoser: BoardRow | null = null;

  for (const company of companies) {
    const pct = company.changePercent;
    if (company.price === null || pct === null) continue;

    quoted += 1;
    if (pct > 0) advancing += 1;
    else if (pct < 0) declining += 1;
    else unchanged += 1;

    if (!topGainer || pct > (topGainer.changePercent ?? Number.NEGATIVE_INFINITY)) {
      topGainer = company;
    }
    if (!topLoser || pct < (topLoser.changePercent ?? Number.POSITIVE_INFINITY)) {
      topLoser = company;
    }
  }

  return { quoted, advancing, declining, unchanged, topGainer, topLoser };
}

export const SECTORS = ["All desks", ...PHARMA_SECTORS] as const;

export type SortKey = "change-desc" | "change-asc" | "name-asc" | "price-desc" | "volume-desc";

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "change-desc", label: "Top gainers" },
  { value: "change-asc", label: "Top losers" },
  { value: "name-asc", label: "A–Z" },
  { value: "price-desc", label: "Price, high→low" },
  { value: "volume-desc", label: "Volume, heaviest" },
];

export function sortBoard(rows: BoardRow[], key: SortKey): BoardRow[] {
  const sorted = [...rows];
  const pct = (row: BoardRow) => row.changePercent;
  const num = (value: number | null, fallback: number) => (value === null ? fallback : value);

  switch (key) {
    case "change-asc":
      sorted.sort((a, b) => num(pct(a), 0) - num(pct(b), 0));
      break;
    case "name-asc":
      sorted.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case "price-desc":
      sorted.sort((a, b) => num(b.price, -1) - num(a.price, -1));
      break;
    case "volume-desc":
      sorted.sort((a, b) => num(b.volume, -1) - num(a.volume, -1));
      break;
    case "change-desc":
    default:
      sorted.sort((a, b) => num(pct(b), 0) - num(pct(a), 0));
      break;
  }

  return sorted;
}
