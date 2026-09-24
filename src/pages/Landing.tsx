import { AppHeader } from "@/components/watchdog/AppHeader";
import { LiveTicker } from "@/components/watchdog/LiveTicker";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { PHARMA_SECTORS } from "@/convex/pharmaData";
import { useAuth } from "@/hooks/use-auth";
import { useNow } from "@/hooks/use-now";
import { summarize, type BoardRow } from "@/lib/board";
import {
  directionMark,
  formatClock,
  formatPercent,
  formatPrice,
  marketState,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import { useQuery } from "convex/react";
import { motion } from "framer-motion";
import { ArrowRight, Binary, Newspaper, Radar } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router";

const CAPABILITIES = [
  {
    icon: Radar,
    title: "Live prices",
    body: "Last-traded levels for every covered ticker, re-read on a timer and timestamped in Indian Standard Time. The tape pauses when the tab goes to the background.",
  },
  {
    icon: Binary,
    title: "Key fundamentals",
    body: "Open any company for its 52-week range, one-year and year-to-date returns, 30-day average volume and a full year of daily price history.",
  },
  {
    icon: Newspaper,
    title: "Recent headlines",
    body: "The latest Indian market coverage for each company, pulled live and linked straight back to the publisher that filed it.",
  },
];

export default function Landing() {
  const board = useQuery(api.pharma.list);
  const { isAuthenticated } = useAuth();
  const now = useNow(1000 * 30);

  const companies = board?.companies ?? [];
  const summary = summarize(companies);
  const catalogHref = isAuthenticated ? "/dashboard" : "/auth?returnTo=%2Fdashboard";
  const open = marketState(new Date(now)) === "open";

  const bySector = new Map<string, BoardRow[]>();
  for (const company of companies) {
    const bucket = bySector.get(company.sector);
    if (bucket) bucket.push(company);
    else bySector.set(company.sector, [company]);
  }

  const statusRows: { key: string; value: ReactNode }[] = [
    { key: "roster", value: `${companies.length} companies` },
    { key: "desks", value: `${PHARMA_SECTORS.length} · formulations, api & cdmo, mnc, biologics` },
    { key: "feed", value: "live · national stock exchange" },
    {
      key: "last read",
      value: board?.quotesUpdatedAt ? formatClock(board.quotesUpdatedAt) : "waiting for first run",
    },
    {
      key: "breadth",
      value: summary.quoted > 0 ? (
        <span className="flex items-center justify-end gap-3">
          <span className="text-gain">▲ {summary.advancing}</span>
          <span className="text-loss">▼ {summary.declining}</span>
          <span className="text-muted-foreground">— {summary.unchanged}</span>
        </span>
      ) : (
        <span className="text-muted-foreground">awaiting tape</span>
      ),
    },
    {
      key: "best / worst",
      value: summary.topGainer && summary.topLoser ? (
        <span className="flex items-center justify-end gap-3">
          <span className="text-gain">
            {summary.topGainer.symbol} {formatPercent(summary.topGainer.changePercent)}
          </span>
          <span className="text-loss">
            {summary.topLoser.symbol} {formatPercent(summary.topLoser.changePercent)}
          </span>
        </span>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
    },
  ];

  return (
    <div className="texture-grid bg-background text-foreground min-h-screen">
      <AppHeader
        actions={
          isAuthenticated ? (
            <Button
              asChild
              size="sm"
              className="rounded-none font-mono text-[0.68rem] tracking-[0.1em] uppercase"
            >
              <Link to="/dashboard">
                Open catalog
                <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          ) : (
            <Button
              asChild
              size="sm"
              className="rounded-none font-mono text-[0.68rem] tracking-[0.1em] uppercase"
            >
              <Link to={catalogHref}>
                Sign in
                <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          )
        }
      />

      <LiveTicker companies={companies} />

      <div className="mx-auto w-full max-w-[1500px] px-4 sm:px-6">
        {/* Hero ------------------------------------------------------------ */}
        <div className="grid gap-10 py-12 lg:grid-cols-2 lg:gap-14 lg:py-16">
          <div>
            <p className="label text-primary">
              <span className="text-muted-foreground">//</span> nse · pharmaceuticals · realtime
            </p>
            <h2 className="mt-5 font-mono text-3xl leading-[1.15] font-semibold tracking-[0.04em] sm:text-4xl lg:text-[2.75rem]">
              A watchdog for the entire NSE pharma shelf.
            </h2>
            <p className="text-muted-foreground mt-5 max-w-xl text-sm leading-7">
              Forty-two pharmaceutical companies trade on the National Stock Exchange. NSE Watchdog
              keeps all of them in one searchable console — live prices, key fundamentals and recent
              headlines — so the sector can be read in a single pass instead of a dozen browser tabs.
            </p>
            <p className="text-muted-foreground mt-4 max-w-xl text-sm leading-7">
              No watchlists to build and no symbols to paste. It is built for one user, and that user
              is me.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button
                asChild
                size="lg"
                className="rounded-none font-mono text-[0.72rem] tracking-[0.12em] uppercase"
              >
                <Link to={catalogHref}>
                  Open the catalog
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="rounded-none font-mono text-[0.72rem] tracking-[0.12em] uppercase"
              >
                <a href="#coverage">Browse coverage</a>
              </Button>
            </div>
          </div>

          {/* Live status terminal */}
          <div className="border-border bg-card/60 relative overflow-hidden border">
            <div className="border-border flex items-center gap-2 border-b px-4 py-2.5">
              <span className="bg-loss/70 size-2.5 rounded-full" aria-hidden />
              <span className="bg-chart-4/70 size-2.5 rounded-full" aria-hidden />
              <span className="bg-gain/70 size-2.5 rounded-full" aria-hidden />
              <span className="label-sm text-muted-foreground ml-2">watchdog — status</span>
            </div>

            <div className="px-4 py-3">
              <p className="font-mono text-xs">
                <span className="text-primary">$</span>{" "}
                <span className="text-foreground">watchdog status --sector pharma</span>
              </p>
            </div>

            <div className="divide-border border-border border-t">
              {statusRows.map((row) => (
                <div
                  key={row.key}
                  className="border-border/70 flex items-baseline justify-between gap-4 border-b px-4 py-2.5 last:border-b-0"
                >
                  <span className="label-sm text-muted-foreground shrink-0">{row.key}</span>
                  <span className="text-right font-mono text-xs">{row.value}</span>
                </div>
              ))}
            </div>

            <div className="border-border border-t px-4 py-3">
              <p className="label-sm text-muted-foreground">
                {open ? (
                  <>
                    <span className="text-gain">●</span> session running · refreshing every 20s
                  </>
                ) : (
                  <>
                    <span className="text-muted-foreground">●</span> market closed · showing last
                    published levels
                  </>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Capabilities ---------------------------------------------------- */}
        <section className="border-border border-t py-12">
          <div className="border-border flex flex-wrap items-baseline justify-between gap-3 border-b pb-3">
            <h3 className="font-mono text-lg font-semibold tracking-[0.08em]">
              What it actually does
            </h3>
            <span className="label-sm text-muted-foreground">three moving parts</span>
          </div>

          <div className="grid gap-px bg-border lg:grid-cols-3">
            {CAPABILITIES.map((item) => (
              <div key={item.title} className="bg-background p-6">
                <span className="border-border bg-card/60 text-primary grid size-9 place-items-center border">
                  <item.icon className="size-4" />
                </span>
                <h4 className="mt-4 font-mono text-sm font-semibold tracking-[0.08em]">
                  {item.title}
                </h4>
                <p className="text-muted-foreground mt-3 text-xs leading-6">{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Coverage -------------------------------------------------------- */}
        <section id="coverage" className="border-border border-t py-12">
          <div className="border-border flex flex-wrap items-baseline justify-between gap-3 border-b pb-3">
            <h3 className="font-mono text-lg font-semibold tracking-[0.08em]">
              Coverage — every listed name
            </h3>
            <span className="label-sm text-muted-foreground">
              {companies.length} nse pharmaceutical listings
            </span>
          </div>

          <div className="grid gap-x-8 gap-y-10 pt-8 md:grid-cols-2 xl:grid-cols-4">
            {PHARMA_SECTORS.map((sector) => {
              const rows = bySector.get(sector) ?? [];
              if (rows.length === 0) return null;
              return (
                <div key={sector}>
                  <p className="border-border text-foreground label-sm flex items-center justify-between border-b pb-2">
                    <span>{sector}</span>
                    <span className="text-muted-foreground">{rows.length}</span>
                  </p>
                  <ul className="divide-border divide-y">
                    {rows.map((row) => (
                      <li key={row.symbol}>
                        <Link
                          to={`/stock/${row.symbol}`}
                          className="hover:bg-accent/40 group -mx-2 flex items-baseline justify-between gap-3 px-2 py-2 transition-colors"
                        >
                          <span className="min-w-0">
                            <span className="group-hover:text-primary block font-mono text-[0.68rem] font-medium tracking-[0.08em] transition-colors">
                              {row.symbol}
                            </span>
                            <span className="text-muted-foreground block truncate text-[0.72rem]">
                              {row.name}
                            </span>
                          </span>
                          <span className="tabular shrink-0 font-mono text-[0.7rem]">
                            {row.price === null ? (
                              <span className="text-muted-foreground">—</span>
                            ) : (
                              <span
                                className={cn(
                                  (row.changePercent ?? 0) >= 0 ? "text-gain" : "text-loss",
                                )}
                              >
                                {directionMark(row.changePercent)}{" "}
                                {formatPercent(row.changePercent)}
                              </span>
                            )}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </section>

        {/* Closing call ---------------------------------------------------- */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="border-border bg-card/60 texture-dots my-12 border p-8 sm:p-12"
        >
          <p className="label text-primary">ready when you are</p>
          <h3 className="mt-4 max-w-2xl font-mono text-2xl leading-snug font-semibold tracking-[0.04em] sm:text-3xl">
            Sign in and the tape starts running immediately.
          </h3>
          <p className="text-muted-foreground mt-4 max-w-xl text-sm leading-7">
            Live prices, key fundamentals and recent headlines for all{" "}
            {companies.length > 0 ? companies.length : 42} covered companies. Guest access is
            available if you would rather look around first.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Button
              asChild
              size="lg"
              className="rounded-none font-mono text-[0.72rem] tracking-[0.12em] uppercase"
            >
              <Link to={catalogHref}>
                Open the catalog
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="rounded-none font-mono text-[0.72rem] tracking-[0.12em] uppercase"
            >
              <Link to="/auth">Use guest access</Link>
            </Button>
          </div>
        </motion.section>

        <footer className="border-border text-muted-foreground border-t py-6 font-mono text-[0.7rem] leading-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <p className="max-w-3xl">
              <span className="text-foreground">method:</span> symbols are the NSE tickers for the
              covered companies. Prices, fundamentals and headlines come from public NSE-listed
              market and newswire feeds, refreshed on a timer while the console is open. Levels are
              indicative, may be delayed outside market hours, and are published for personal
              reference only.
            </p>
            <p className="label-sm">not investment advice</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
