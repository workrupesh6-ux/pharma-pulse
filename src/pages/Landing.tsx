import { MarketTape } from "@/components/gazette/MarketTape";
import { Masthead } from "@/components/gazette/Masthead";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { PHARMA_SECTORS } from "@/convex/pharmaData";
import { useAuth } from "@/hooks/use-auth";
import { summarize, type BoardRow } from "@/lib/board";
import { directionMark, formatClock, formatPercent, formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useQuery } from "convex/react";
import { motion } from "framer-motion";
import { ArrowRight, Lock } from "lucide-react";
import { Link } from "react-router";

const METHOD_STEPS = [
  {
    numeral: "I",
    title: "Prices, not estimates",
    body: "Last-traded levels for the covered NSE tickers, re-read continuously while the board is open and stamped in Indian Standard Time.",
  },
  {
    numeral: "II",
    title: "The whole shelf, not a watchlist",
    body: "Every covered pharmaceutical name is on the page from the first second — formulators, API and CDMO houses, MNC arms and biologics alike.",
  },
  {
    numeral: "III",
    title: "Breadth at a glance",
    body: "Advancers against decliners, the session's best and worst movers, and a day-range bar against each name so one look covers the sector.",
  },
];

export default function Landing() {
  const board = useQuery(api.pharma.list);
  const { isAuthenticated } = useAuth();
  const now = new Date();

  const companies = board?.companies ?? [];
  const summary = summarize(companies);
  const boardHref = isAuthenticated ? "/dashboard" : "/auth?returnTo=%2Fdashboard";

  const bySector = new Map<string, BoardRow[]>();
  for (const company of companies) {
    const bucket = bySector.get(company.sector);
    if (bucket) bucket.push(company);
    else bySector.set(company.sector, [company]);
  }

  const breadthTotal = summary.advancing + summary.declining + summary.unchanged;
  const advancingShare = breadthTotal > 0 ? (summary.advancing / breadthTotal) * 100 : 50;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="texture-newsprint bg-background text-foreground min-h-screen"
    >
      <Masthead
        date={now}
        actions={
          isAuthenticated ? (
            <Button asChild size="sm" className="font-mono rounded-none text-[0.7rem] tracking-[0.14em] uppercase">
              <Link to="/dashboard">
                Open the board
                <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          ) : (
            <Button asChild size="sm" className="font-mono rounded-none text-[0.7rem] tracking-[0.14em] uppercase">
              <Link to={boardHref}>
                <Lock className="size-3.5" />
                Sign in
              </Link>
            </Button>
          )
        }
        className="border-foreground border-t-4"
      />

      <p className="kicker text-muted-foreground mx-auto w-full max-w-[1400px] px-4 pt-4 sm:px-6">
        Market tape — live
      </p>
      <MarketTape companies={companies} className="mt-2" />

      <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6">
        {/* ---------------------------------------------------------------- */}
        {/* Front page                                                        */}
        {/* ---------------------------------------------------------------- */}
        <div className="border-foreground mt-8 grid border-b-2 pb-10 lg:grid-cols-12 lg:gap-0">
          <article className="lg:border-border lg:col-span-8 lg:border-r lg:pr-10">
            <p className="kicker text-primary">Market Desk · Lead</p>
            <h2 className="font-masthead mt-3 text-[2.1rem] leading-[0.98] font-black tracking-tight sm:text-[2.75rem] lg:text-[3.4rem]">
              The whole pharma shelf, priced live.
            </h2>
            <p className="border-border mt-5 border-y py-4 font-serif text-lg leading-snug italic sm:text-xl">
              Forty-two pharmaceutical companies trade on the National Stock Exchange. This gazette
              opens with all of them on one page — last traded price, the move on the day, the day's
              range and volume — and keeps re-reading the market while you watch.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Button
                asChild
                size="lg"
                className="font-mono rounded-none text-[0.72rem] tracking-[0.16em] uppercase"
              >
                <Link to={boardHref}>
                  Open the live board
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="font-mono rounded-none text-[0.72rem] tracking-[0.16em] uppercase"
              >
                <a href="#coverage">See the coverage</a>
              </Button>
            </div>

            <div className="mt-8 gap-8 sm:columns-2">
              <p className="drop-cap font-serif text-[1.02rem] leading-7">
                Most market screens ask you to build a watchlist before they will show you anything.
                This one does not. The desk covers the Indian pharmaceutical sector end to end — the
                large-cap formulators, the API and CDMO houses, the multi-national arms and the
                biologics names — and prints them together, so a move in one is read against all the
                rest of them.
              </p>
              <p className="font-serif mt-5 text-[1.02rem] leading-7">
                Prices arrive from a live NSE-listed quote feed and are stamped in Indian Standard
                Time. The tape refreshes on its own every twenty seconds while the board is open. When
                the cash market is shut, the last published levels stay on the page beside their
                timestamp, so nothing ever looks fresher than it is.
              </p>
              <p className="font-serif mt-5 text-[1.02rem] leading-7">
                Sort by the day's move, search a symbol, or narrow the page to a single desk —
                formulations, API and CDMO, MNC or biologics. Breadth, the best and worst performers
                of the session, and the coverage count all sit above the table, so the sector reads at
                a glance before you scroll.
              </p>
            </div>
          </article>

          {/* At a glance */}
          <aside className="mt-10 lg:col-span-4 lg:mt-0 lg:pl-10">
            <div className="border-foreground border-2">
              <div className="border-foreground border-b-2 px-4 py-2">
                <p className="kicker text-center">At a glance</p>
              </div>
              <div className="bg-card p-4">
                {summary.quoted > 0 ? (
                  <>
                    <p className="font-mono tabular text-4xl font-semibold">{summary.quoted}</p>
                    <p className="kicker text-muted-foreground mt-1">
                      of {companies.length} names quoting
                    </p>

                    <div className="border-border mt-4 border-t pt-3">
                      <div className="flex h-2.5 w-full overflow-hidden">
                        <div className="bg-gain" style={{ width: `${advancingShare}%` }} />
                        <div className="bg-loss" style={{ width: `${100 - advancingShare}%` }} />
                      </div>
                      <dl className="mt-3 space-y-1.5 font-mono text-xs">
                        <div className="flex items-baseline justify-between">
                          <dt className="text-muted-foreground">Advancing</dt>
                          <dd className="tabular text-gain">{summary.advancing}</dd>
                        </div>
                        <div className="flex items-baseline justify-between">
                          <dt className="text-muted-foreground">Declining</dt>
                          <dd className="tabular text-loss">{summary.declining}</dd>
                        </div>
                        <div className="flex items-baseline justify-between">
                          <dt className="text-muted-foreground">Unchanged</dt>
                          <dd className="tabular text-muted-foreground">{summary.unchanged}</dd>
                        </div>
                      </dl>
                    </div>

                    <div className="border-border grid grid-cols-2 gap-4 border-t pt-3">
                      <MiniMover label="Top gainer" row={summary.topGainer} />
                      <MiniMover label="Top loser" row={summary.topLoser} />
                    </div>

                    <p className="border-border text-muted-foreground mt-4 border-t pt-3 font-mono text-[0.65rem]">
                      Tape read {formatClock(board?.quotesUpdatedAt)}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-mono tabular text-4xl font-semibold">{companies.length}</p>
                    <p className="kicker text-muted-foreground mt-1">names on the roster</p>
                    <p className="border-border font-serif mt-4 border-t pt-3 text-sm leading-6">
                      The live tape fills the moment a signed-in reader opens the board. Until then
                      this page prints the roster alone.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {PHARMA_SECTORS.map((sector) => (
                        <span
                          key={sector}
                          className="border-border text-muted-foreground border px-2 py-1 font-mono text-[0.6rem] tracking-[0.1em] uppercase"
                        >
                          {sector}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="border-foreground mt-6 border-t-4 pt-4">
              <p className="kicker text-muted-foreground">Today's edition</p>
              <p className="font-masthead mt-2 text-lg leading-snug">
                Printed continuously from Mumbai. Prices update every twenty seconds.
              </p>
            </div>
          </aside>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Method                                                            */}
        {/* ---------------------------------------------------------------- */}
        <section className="border-foreground border-b-2 py-10">
          <div className="border-foreground flex items-baseline justify-between border-b pb-2">
            <h3 className="font-masthead text-2xl font-bold tracking-tight sm:text-3xl">
              How the desk is set
            </h3>
            <span className="kicker text-muted-foreground hidden sm:inline">The method</span>
          </div>

          <div className="grid divide-y lg:grid-cols-3 lg:divide-x lg:divide-y-0">
            {METHOD_STEPS.map((step) => (
              <div key={step.numeral} className="lg:border-border py-6 lg:px-8 lg:first:pl-0 lg:last:pr-0">
                <span className="font-masthead text-primary text-3xl font-black">{step.numeral}</span>
                <h4 className="font-masthead mt-3 text-xl font-bold tracking-tight">{step.title}</h4>
                <p className="font-serif text-muted-foreground mt-2 text-[0.95rem] leading-6">
                  {step.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Coverage list                                                     */}
        {/* ---------------------------------------------------------------- */}
        <section id="coverage" className="border-foreground border-b-2 py-10">
          <div className="border-foreground flex flex-wrap items-baseline justify-between gap-2 border-b pb-2">
            <h3 className="font-masthead text-2xl font-bold tracking-tight sm:text-3xl">
              The coverage list
            </h3>
            <span className="kicker text-muted-foreground">
              {companies.length} NSE pharmaceutical listings
            </span>
          </div>

          <div className="grid gap-x-8 gap-y-8 pt-8 md:grid-cols-2 xl:grid-cols-4">
            {PHARMA_SECTORS.map((sector) => {
              const rows = bySector.get(sector) ?? [];
              if (rows.length === 0) return null;
              return (
                <div key={sector}>
                  <p className="border-foreground border-b-2 pb-1.5 font-mono text-[0.68rem] font-semibold tracking-[0.16em] uppercase">
                    {sector}
                    <span className="text-muted-foreground ml-2 font-normal">{rows.length}</span>
                  </p>
                  <ul className="divide-border divide-y">
                    {rows.map((row) => (
                      <li
                        key={row.symbol}
                        className="flex items-baseline justify-between gap-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="font-mono text-[0.66rem] font-semibold tracking-[0.12em]">
                            {row.symbol}
                          </p>
                          <p className="text-muted-foreground truncate font-serif text-[0.82rem]">
                            {row.name}
                          </p>
                        </div>
                        <span className="tabular font-mono text-xs whitespace-nowrap">
                          {row.price === null ? (
                            <span className="text-muted-foreground">—</span>
                          ) : (
                            formatPrice(row.price)
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Closing call                                                      */}
        {/* ---------------------------------------------------------------- */}
        <section className="bg-foreground text-background texture-newsprint border-foreground my-10 border-2 px-6 py-10 text-center sm:px-12">
          <p className="kicker text-background/60">Read the market as it moves</p>
          <h3 className="font-masthead mx-auto mt-4 max-w-3xl text-3xl leading-[1.02] font-black tracking-tight sm:text-5xl">
            The sector, on one page, the moment you open it.
          </h3>
          <p className="text-background/75 mx-auto mt-4 max-w-xl font-serif text-base leading-7 italic">
            Sign in and the tape starts running immediately. Guest access is available if you would
            rather look before you subscribe.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Button
              asChild
              size="lg"
              variant="secondary"
              className="font-mono rounded-none text-[0.72rem] tracking-[0.16em] uppercase"
            >
              <Link to={boardHref}>
                Open the live board
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-background/40 text-background hover:bg-background/10 hover:text-background font-mono rounded-none bg-transparent text-[0.72rem] tracking-[0.16em] uppercase"
            >
              <a href="#coverage">Browse the roster</a>
            </Button>
          </div>
        </section>

        <footer className="border-foreground text-muted-foreground border-t-2 py-6 font-serif text-[0.78rem] leading-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <p className="max-w-2xl">
              <span className="text-foreground font-semibold">Method &amp; corrections:</span>{" "}
              symbols are the NSE tickers for the covered companies. Quotes come from a public
              NSE-listed market feed and are refreshed every twenty seconds while the board is open.
              Levels are indicative, may be delayed outside market hours, and are published here for
              personal reference only.
            </p>
            <p className="font-mono text-[0.65rem] tracking-[0.12em] uppercase">
              Not investment advice
            </p>
          </div>
        </footer>
      </div>
    </motion.div>
  );
}

function MiniMover({ label, row }: { label: string; row: BoardRow | null }) {
  return (
    <div>
      <p className="kicker text-muted-foreground">{label}</p>
      {row ? (
        <>
          <p className="mt-1.5 font-mono text-[0.7rem] font-semibold tracking-[0.12em]">
            {row.symbol}
          </p>
          <p
            className={cn(
              "tabular mt-0.5 font-mono text-xs",
              (row.changePercent ?? 0) >= 0 ? "text-gain" : "text-loss",
            )}
          >
            {directionMark(row.changePercent)} {formatPercent(row.changePercent)}
          </p>
        </>
      ) : (
        <p className="text-muted-foreground mt-1.5 font-mono text-xs">—</p>
      )}
    </div>
  );
}
