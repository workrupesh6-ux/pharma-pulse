import { cn } from "@/lib/utils";
import { rangePosition } from "@/lib/format";
import type { ReactNode } from "react";

/** A bordered console panel with a monospace title bar. */
export function Panel({
  title,
  meta,
  action,
  children,
  className,
  bodyClassName,
}: {
  title: string;
  meta?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn("border-border bg-card/40 border", className)}>
      <div className="border-border flex flex-wrap items-center justify-between gap-3 border-b px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="label text-foreground">{title}</h2>
          {meta ? <span className="label-sm text-muted-foreground">{meta}</span> : null}
        </div>
        {action}
      </div>
      <div className={cn("px-4 py-3", bodyClassName)}>{children}</div>
    </section>
  );
}

/** One line of a key/value block. Values are monospace and right-aligned. */
export function KeyValue({
  label,
  value,
  note,
  tone,
}: {
  label: string;
  value: ReactNode;
  note?: string;
  tone?: "gain" | "loss";
}) {
  return (
    <div className="border-border/70 flex items-baseline justify-between gap-4 border-b py-2 last:border-b-0">
      <span className="label-sm text-muted-foreground shrink-0">{label}</span>
      <span className="text-right">
        <span
          className={cn(
            "tabular font-mono text-sm",
            tone === "gain" && "text-gain",
            tone === "loss" && "text-loss",
          )}
        >
          {value}
        </span>
        {note ? (
          <span className="label-sm text-muted-foreground mt-0.5 block">{note}</span>
        ) : null}
      </span>
    </div>
  );
}

/** A marker positioned inside a low–high band. */
export function RangeMeter({
  low,
  high,
  value,
  className,
}: {
  low: number | null;
  high: number | null;
  value: number | null;
  className?: string;
}) {
  const position = rangePosition(low, high, value);

  if (position === null) {
    return <span className="text-muted-foreground font-mono text-xs">—</span>;
  }

  return (
    <span className={cn("bg-muted relative block h-1.5 w-full", className)} aria-hidden>
      <span className="bg-border absolute inset-y-0 left-0" style={{ width: `${position}%` }} />
      <span
        className="bg-foreground absolute top-1/2 size-2 -translate-x-1/2 -translate-y-1/2"
        style={{ left: `${position}%` }}
      />
    </span>
  );
}
