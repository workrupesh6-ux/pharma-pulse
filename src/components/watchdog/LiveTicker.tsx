import { cn } from "@/lib/utils";
import type { BoardRow } from "@/lib/board";
import { directionMark, formatPercent, formatPrice } from "@/lib/format";

function TapeItem({ row }: { row: BoardRow }) {
  const pct = row.changePercent;
  const tone = pct === null || pct === 0 ? "text-muted-foreground" : pct > 0 ? "text-gain" : "text-loss";

  return (
    <span className="border-border flex shrink-0 items-baseline gap-2.5 border-r px-4 py-2">
      <span className="text-foreground font-mono text-[0.7rem] font-medium tracking-[0.1em]">
        {row.symbol}
      </span>
      <span className="tabular text-foreground/80 font-mono text-[0.78rem]">
        {formatPrice(row.price)}
      </span>
      <span className={cn("tabular font-mono text-[0.7rem]", tone)}>
        {directionMark(pct)} {formatPercent(pct)}
      </span>
    </span>
  );
}

/**
 * The live tape. The track is rendered twice so the -50% keyframe loops without
 * a seam; hovering pauses the run so a level can be read.
 */
export function LiveTicker({ companies, className }: { companies: BoardRow[]; className?: string }) {
  const quoted = companies.filter((company) => company.price !== null);
  const items = quoted.length > 0 ? quoted : companies;

  if (items.length === 0) return null;

  return (
    <div
      className={cn("border-border bg-card relative overflow-hidden border-y", className)}
      aria-label="Live market tape"
    >
      <div className="animate-ticker flex w-max">
        {[...items, ...items].map((row, index) => (
          <TapeItem key={`${row.symbol}-${index}`} row={row} />
        ))}
      </div>

      <span className="from-card via-card pointer-events-none absolute inset-y-0 left-0 flex items-center gap-2 bg-gradient-to-r to-transparent pr-12 pl-4">
        <span className="bg-loss animate-blink size-1.5 rounded-full" aria-hidden />
        <span className="label-sm text-muted-foreground">live tape</span>
      </span>
    </div>
  );
}
