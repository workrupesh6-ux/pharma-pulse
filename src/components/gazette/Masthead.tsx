import { cn } from "@/lib/utils";
import { editionNumber, formatEditionDate, istParts } from "@/lib/format";
import type { ReactNode } from "react";

const TITLE = "The Pharma Exchange";
const TAGLINE = "A live gazette of every pharmaceutical company listed on the NSE";

type MastheadProps = {
  /** full = front page, compact = the interior pages' running head. */
  size?: "full" | "compact";
  date: Date;
  /** Buttons slotted into the compact head. */
  actions?: ReactNode;
  className?: string;
};

/**
 * The paper's nameplate. The full variant prints the front page banner with the
 * dateline, edition number and volume; the compact variant is the running head
 * used above the live board and the subscriber gate.
 */
export function Masthead({ size = "full", date, actions, className }: MastheadProps) {
  const parts = istParts(date);
  const dateline = formatEditionDate(date);

  if (size === "compact") {
    return (
      <header className={cn("border-foreground border-b-2", className)}>
        <div className="mx-auto flex w-full max-w-[1400px] flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-baseline gap-3">
            <span className="font-masthead text-2xl leading-none font-black tracking-tight sm:text-3xl">
              {TITLE}
            </span>
            <span className="kicker text-muted-foreground hidden sm:inline">
              {parts.weekday.slice(0, 3)} · No. {editionNumber(date)}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="kicker text-muted-foreground hidden md:inline">{dateline}</span>
            {actions}
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className={cn("pt-3", className)}>
      <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6">
        {/* Dateline strip */}
        <div className="border-foreground/25 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b pt-1 pb-2">
          <span className="kicker">Mumbai Edition</span>
          <span className="kicker text-muted-foreground hidden sm:inline">
            Live from the National Stock Exchange
          </span>
          <span className="kicker">{dateline}</span>
        </div>

        {/* Nameplate */}
        <h1 className="font-masthead pt-5 pb-3 text-center text-[2.6rem] leading-[0.9] font-black tracking-[-0.02em] sm:text-6xl lg:text-[5.5rem]">
          {TITLE}
        </h1>

        {/* Standing head */}
        <div className="border-foreground border-y-2 py-2">
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
            <span className="kicker text-muted-foreground">Vol. I — No. {editionNumber(date)}</span>
            <p className="font-serif text-muted-foreground text-center text-sm italic sm:text-[0.95rem]">
              {TAGLINE}
            </p>
            <div className="flex items-center gap-2">{actions}</div>
          </div>
        </div>
      </div>
    </header>
  );
}
