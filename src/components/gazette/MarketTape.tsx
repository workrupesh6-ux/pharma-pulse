import { cn } from "@/lib/utils";
import type { BoardRow } from "@/lib/board";
import { directionMark, formatPercent, formatPrice } from "@/lib/format";

function TapeItem({ row }: { row: BoardRow }) {
  const tone =
    row.changePercent === null || row.changePercent === 0
      ? "text-background/60"
      : row.changePercent > 0
        ? "text-gain-bright"
        : "text-loss-bright";

  return (
    <span className="border-background/20 flex shrink-0 items-baseline gap-2.5 border-r px-4 py-2">
      <span className="font-mono text-[0.7rem] font-semibold tracking-[0.14em]">{row.symbol}</span>
      <span className="font-mono tabular text-[0.8rem]">{formatPrice(row.price)}</span>
      <span className={cn("font-mono tabular text-[0.7rem] font-medium", tone)}>
        {directionMark(row.changePercent)} {formatPercent(row.changePercent)}
      </span>
    </span>
  );
}

/**
 * The continuous market tape. The track is rendered twice so the -50% keyframe
 * loops without a visible seam. Hovering pauses the run.
 */
export function MarketTape({
  companies,
  className,
}: {
  companies: BoardRow[];
  className?: string;
}) {
  const quoted = companies.filter((company) => company.price !== null);
  const items = quoted.length > 0 ? quoted : companies;

  if (items.length === 0) return null;

  return (
    <div
      className={cn(
        "border-foreground bg-foreground text-background texture-newsprint relative overflow-hidden border-y-2",
        className,
      )}
      aria-label="Live market tape"
    >
      <div className="animate-ticker flex w-max">
        {[...items, ...items].map((row, index) => (
          <TapeItem key={`${row.symbol}-${index}`} row={row} />
        ))}
      </div>
    </div>
  );
}
