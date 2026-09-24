import { cn } from "@/lib/utils";
import { marketState } from "@/lib/format";
import { Radar } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router";

/** Market open/closed indicator, reused across the header and the detail page. */
export function StatusPill({
  open,
  className,
}: {
  open: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "label-sm inline-flex items-center gap-2 border px-2.5 py-1.5",
        open
          ? "border-gain/40 bg-gain/10 text-gain"
          : "border-border bg-muted/60 text-muted-foreground",
        className,
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          open ? "bg-gain animate-blink" : "bg-muted-foreground",
        )}
        aria-hidden
      />
      {open ? "market open" : "market closed"}
    </span>
  );
}

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="group flex items-center gap-2.5">
      <span className="border-primary/40 bg-primary/10 text-primary grid size-8 place-items-center border">
        <Radar className="size-4" />
      </span>
      <span className="leading-none">
        <span
          className={cn(
            "block font-mono font-semibold tracking-[0.14em] text-foreground",
            compact ? "text-sm" : "text-base",
          )}
        >
          NSE WATCHDOG
        </span>
        {!compact && (
          <span className="label-sm text-muted-foreground mt-1 block">pharma stalker</span>
        )}
      </span>
    </Link>
  );
}

type AppHeaderProps = {
  /** full = landing banner with the command line; compact = app running head. */
  size?: "full" | "compact";
  actions?: ReactNode;
  /** Second row of the compact header, e.g. a breadcrumb. */
  subline?: ReactNode;
  className?: string;
};

/**
 * The console's chrome. The full banner spells out what the app watches with a
 * literal command line; the compact running head is sticky on app routes.
 */
export function AppHeader({ size = "full", actions, subline, className }: AppHeaderProps) {
  const open = marketState(new Date()) === "open";

  if (size === "compact") {
    return (
      <header
        className={cn(
          "border-border bg-background/90 sticky top-0 z-30 border-b backdrop-blur",
          className,
        )}
      >
        <div className="mx-auto flex w-full max-w-[1500px] flex-wrap items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
          <div className="flex items-center gap-4">
            <Brand compact />
            <span className="bg-border hidden h-5 w-px sm:block" aria-hidden />
            <nav className="hidden items-center gap-4 sm:flex">
              <Link
                to="/dashboard"
                className="label-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                catalog
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <StatusPill open={open} className="hidden md:inline-flex" />
            {actions}
          </div>
        </div>
        {subline ? (
          <div className="border-border text-muted-foreground mx-auto w-full max-w-[1500px] border-t px-4 py-2 font-mono text-xs sm:px-6">
            {subline}
          </div>
        ) : null}
      </header>
    );
  }

  return (
    <header className={cn("border-border bg-card/40 border-b", className)}>
      <div className="mx-auto w-full max-w-[1500px] px-4 sm:px-6">
        <div className="border-border flex flex-wrap items-center justify-between gap-3 border-b py-2.5">
          <span className="label-sm text-muted-foreground">
            <span className="text-primary">//</span> personal market console
          </span>
          <div className="flex items-center gap-3">
            <StatusPill open={open} />
            {actions}
          </div>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-6 py-7">
          <div>
            <div className="flex items-center gap-3">
              <span className="border-primary/40 bg-primary/10 text-primary grid size-10 place-items-center border">
                <Radar className="size-5" />
              </span>
              <h1 className="font-mono text-2xl font-semibold tracking-[0.14em] text-foreground sm:text-3xl">
                NSE WATCHDOG
              </h1>
            </div>
            <p className="text-muted-foreground mt-4 font-mono text-xs sm:text-sm">
              <span className="text-primary">$</span> watchdog --track pharma --exchange NSE
              --realtime
            </p>
          </div>

          <div className="max-w-md">
            <span className="border-signal/40 bg-signal/10 text-signal label-sm inline-flex items-center border px-2.5 py-1.5">
              pharma stalker
            </span>
            <p className="text-muted-foreground mt-3 font-mono text-xs leading-5">
              Live prices, key fundamentals and recent headlines for every pharmaceutical company
              listed on the National Stock Exchange.
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
