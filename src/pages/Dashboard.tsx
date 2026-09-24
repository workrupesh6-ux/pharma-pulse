import { MarketTape } from "@/components/gazette/MarketTape";
import { Masthead } from "@/components/gazette/Masthead";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { REFRESH_INTERVAL_MS, useLiveQuotes } from "@/hooks/use-live-quotes";
import { SECTORS, SORT_OPTIONS, sortBoard, summarize, type BoardRow, type SortKey } from "@/lib/board";
import {
  directionMark,
  formatClock,
  formatPercent,
  formatPrice,
  formatSignedPrice,
  formatVolume,
  marketState,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import { useQuery } from "convex/react";
import { motion } from "framer-motion";
import { AlertTriangle, LogOut, RotateCw, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router";

const NUMBER = "tabular font-mono text-[0.8rem]";

export default function Dashboard() {
  const { user, isAuthenticated, signOut } = useAuth();
  const navigate = useNavigate();
  const board = useQuery(api.pharma.list);
  const { isRefreshing, error, refreshNow } = useLiveQuotes(isAuthenticated);

  const [search, setSearch] = useState("");
  const [sector, setSector] = useState<string>(SECTORS[0]);
  const [sortKey, setSortKey] = useState<SortKey>("change-desc");

  const now = new Date();
  const open = marketState(now) === "open";

  const companies = useMemo(() => board?.companies ?? [], [board]);
  const summary = summarize(companies);
  const quotesUpdatedAt = board?.quotesUpdatedAt ?? null;

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    const filtered = companies.filter((company) => {
      if (sector !== SECTORS[0] && company.sector !== sector) return false;
      if (!term) return true;
      return (
        company.symbol.toLowerCase().includes(term) || company.name.toLowerCase().includes(term)
      );
    });
    return sortBoard(filtered, sortKey);
  }, [companies, search, sector, sortKey]);

  const isLoading = board === undefined;
  const awaitingFirstTape = !isLoading && summary.quoted === 0;

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="texture-newsprint bg-background text-foreground min-h-screen"
    >
      <Masthead
        size="compact"
        date={now}
        className="border-t-4"
        actions={
          <div className="flex items-center gap-2">
            {user?.name || user?.email ? (
              <span className="kicker text-muted-foreground hidden sm:inline">
                {user.name ?? user.email}
              </span>
            ) : null}
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="font-mono rounded-none text-[0.68rem] tracking-[0.14em] uppercase"
              onClick={handleSignOut}
            >
              <LogOut className="size-3.5" />
              Sign out
            </Button>
          </div>
        }
      />

      <p className="kicker text-muted-foreground mx-auto w-full max-w-[1400px] px-4 pt-4 sm:px-6">
        Market tape — live
      </p>
      <MarketTape companies={companies} className="mt-2" />

      <div className="mx-auto w-full max-w-[1400px] px-4 pb-16 sm:px-6">
        {/* ---------------------------------------------------------------- */}
        {/* Desk head                                                         */}
        {/* ---------------------------------------------------------------- */}
        <div className="border-foreground mt-8 flex flex-wrap items-end justify-between gap-4 border-b-2 pb-4">
          <div>
            <p className="kicker text-primary">Pharma desk · National Stock Exchange</p>
            <h1 className="font-masthead mt-2 text-4xl leading-none font-black tracking-tight sm:text-5xl">
              The Live Board
            </h1>
            <p className="text-muted-foreground mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[0.68rem] tracking-[0.1em] uppercase">
              <span className="inline-flex items-center gap-1.5">
                <span
                  className={cn(
                    "animate-blink inline-block size-2 rounded-full",
                    open ? "bg-gain" : "bg-muted-foreground",
                  )}
                  aria-hidden
                />
                {open ? "Market open" : "Market closed"}
              </span>
              <span aria-hidden>·</span>
              <span>
                {quotesUpdatedAt ? `Tape read ${formatClock(new Date(quotesUpdatedAt))}` : "No tape yet"}
              </span>
              <span aria-hidden>·</span>
              <span>Auto every {Math.round(REFRESH_INTERVAL_MS / 1000)}s</span>
            </p>
          </div>

          <Button
            type="button"
            onClick={() => void refreshNow()}
            disabled={isRefreshing}
            className="font-mono rounded-none text-[0.68rem] tracking-[0.14em] uppercase"
          >
            <RotateCw className={cn("size-3.5", isRefreshing && "animate-spin")} />
            {isRefreshing ? "Reading market" : "Refresh tape"}
          </Button>
        </div>

        {error ? (
          <div className="border-destructive text-destructive mt-4 flex items-start gap-3 border-l-4 px-4 py-3">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <p className="font-serif text-sm leading-6">
              <span className="font-semibold">Tape interrupted.</span> {error} Prices shown are the
              last levels published.
            </p>
          </div>
        ) : null}

        {/* ---------------------------------------------------------------- */}
        {/* Breadth                                                           */}
        {/* ---------------------------------------------------------------- */}
        <section className="border-foreground mt-8 grid border-b-2 pb-8 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Names covered" value={String(companies.length)} note="NSE pharmaceutical listings" />
          <Stat
            label="Advancing"
            value={String(summary.advancing)}
            note={`of ${summary.quoted || 0} quoting`}
            tone="gain"
          />
          <Stat label="Declining" value={String(summary.declining)} note="on the day" tone="loss" />
          <div className="border-border py-4 first:pt-0 sm:border-l sm:px-6 lg:px-8">
            <p className="kicker text-muted-foreground">Session breadth</p>
            <div className="bg-muted mt-3 flex h-3 w-full overflow-hidden">
              <div
                className="bg-gain"
                style={{
                  width: `${
                    summary.quoted > 0
                      ? ((summary.advancing / summary.quoted) * 100).toFixed(1)
                      : 50
                  }%`,
                }}
              />
              <div
                className="bg-loss"
                style={{
                  width: `${
                    summary.quoted > 0
                      ? ((summary.declining / summary.quoted) * 100).toFixed(1)
                      : 50
                  }%`,
                }}
              />
            </div>
            <div className="border-border mt-4 grid grid-cols-2 gap-4 border-t pt-3">
              <Mover label="Best of session" row={summary.topGainer} />
              <Mover label="Worst of session" row={summary.topLoser} />
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Controls                                                          */}
        {/* ---------------------------------------------------------------- */}
        <div className="border-border mt-6 flex flex-wrap items-center gap-3 border-b pb-4">
          <div className="relative min-w-[220px] flex-1">
            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search a company or NSE symbol"
              aria-label="Search companies"
              className="border-input bg-card placeholder:text-muted-foreground focus-visible:border-foreground h-10 w-full rounded-none border pr-3 pl-9 font-serif text-sm outline-none"
            />
          </div>

          <label className="flex items-center gap-2">
            <span className="kicker text-muted-foreground">Desk</span>
            <select
              value={sector}
              onChange={(event) => setSector(event.target.value)}
              className="border-input bg-card focus-visible:border-foreground h-10 rounded-none border px-3 font-mono text-[0.7rem] tracking-[0.08em] uppercase outline-none"
            >
              {SECTORS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-2">
            <span className="kicker text-muted-foreground">Order</span>
            <select
              value={sortKey}
              onChange={(event) => setSortKey(event.target.value as SortKey)}
              className="border-input bg-card focus-visible:border-foreground h-10 rounded-none border px-3 font-mono text-[0.7rem] tracking-[0.08em] uppercase outline-none"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <span className="kicker text-muted-foreground ml-auto">
            {rows.length} {rows.length === 1 ? "name" : "names"}
          </span>
        </div>

        {awaitingFirstTape ? (
          <p className="border-border text-muted-foreground mt-6 border-l-4 pl-4 font-serif text-sm italic">
            The desk is waiting on its first tape run. Prices appear here within a few seconds.
          </p>
        ) : null}

        {/* ---------------------------------------------------------------- */}
        {/* The table                                                         */}
        {/* ---------------------------------------------------------------- */}
        {isLoading ? (
          <div className="mt-6 space-y-2">
            {Array.from({ length: 10 }).map((_, index) => (
              <div key={index} className="bg-muted h-11 w-full animate-pulse" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="border-border mt-6 border py-16 text-center">
            <p className="font-masthead text-xl font-bold">Nothing is filed under that cut.</p>
            <p className="text-muted-foreground mt-2 font-serif text-sm italic">
              Try another symbol, or widen the desk back to all covered names.
            </p>
            <Button
              type="button"
              variant="outline"
              className="font-mono mt-5 rounded-none text-[0.68rem] tracking-[0.14em] uppercase"
              onClick={() => {
                setSearch("");
                setSector(SECTORS[0]);
              }}
            >
              Reset the page
            </Button>
          </div>
        ) : (
          <>
            <BoardTable rows={rows} />

            {/* Narrow screens: the same rows, set as notices. */}
            <ul className="mt-6 md:hidden">
              {rows.map((row) => (
                <BoardCard key={row.symbol} row={row} />
              ))}
            </ul>
          </>
        )}

        <footer className="border-foreground text-muted-foreground mt-12 border-t-2 pt-4 font-serif text-[0.78rem] leading-6">
          <p>
            <span className="text-foreground font-semibold">Note:</span> levels are indicative and may
            be delayed outside NSE cash-market hours (09:15–15:30 IST, Monday to Friday, holidays
            excepted). Published for personal reference only — not investment advice.
          </p>
        </footer>
      </div>
    </motion.div>
  );
}

function Stat({
  label,
  value,
  note,
  tone,
}: {
  label: string;
  value: string;
  note: string;
  tone?: "gain" | "loss";
}) {
  return (
    <div className="border-border py-4 sm:border-l sm:px-6 sm:first:border-l-0 sm:first:pl-0 lg:px-8">
      <p className="kicker text-muted-foreground">{label}</p>
      <p
        className={cn(
          "tabular font-mono mt-2 text-3xl font-semibold",
          tone === "gain" && "text-gain",
          tone === "loss" && "text-loss",
        )}
      >
        {value}
      </p>
      <p className="text-muted-foreground mt-1 font-serif text-xs italic">{note}</p>
    </div>
  );
}

function Mover({ label, row }: { label: string; row: BoardRow | null }) {
  return (
    <div>
      <p className="kicker text-muted-foreground">{label}</p>
      {row ? (
        <>
          <p className="mt-1.5 font-mono text-[0.72rem] font-semibold tracking-[0.1em]">
            {row.symbol}
          </p>
          <p
            className={cn(
              "tabular font-mono mt-0.5 text-xs",
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

/** A bullish/bearish underline, printed as a hairline under the close. */
function RangeBar({ row }: { row: BoardRow }) {
  const { dayLow, dayHigh, price } = row;
  if (dayLow === null || dayHigh === null || price === null || dayHigh <= dayLow) {
    return <span className="text-muted-foreground font-mono text-xs">—</span>;
  }

  const position = Math.min(100, Math.max(0, ((price - dayLow) / (dayHigh - dayLow)) * 100));

  return (
    <div className="flex items-center gap-2">
      <span className="tabular text-muted-foreground w-16 text-right font-mono text-[0.7rem]">
        {formatPrice(dayLow)}
      </span>
      <span className="bg-muted relative block h-1.5 w-14 shrink-0" aria-hidden>
        <span
          className="bg-foreground absolute top-1/2 size-2 -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${position}%` }}
        />
      </span>
      <span className="tabular text-muted-foreground w-16 font-mono text-[0.7rem]">
        {formatPrice(dayHigh)}
      </span>
    </div>
  );
}

const HEAD =
  "sticky top-0 z-10 bg-background border-foreground border-b-2 px-3 py-2 font-mono text-[0.6rem] font-semibold uppercase tracking-[0.16em] whitespace-nowrap";

function BoardTable({ rows }: { rows: BoardRow[] }) {
  return (
    <div className="mt-4 hidden overflow-x-auto md:block md:max-h-[70vh] md:overflow-y-auto">
      <table className="w-full min-w-[920px] border-collapse text-left">
        <thead>
          <tr>
            <th className={cn(HEAD, "w-10 text-center")}>№</th>
            <th className={HEAD}>Company</th>
            <th className={cn(HEAD, "text-right")}>LTP ₹</th>
            <th className={cn(HEAD, "text-right")}>Chg ₹</th>
            <th className={cn(HEAD, "text-right")}>Chg %</th>
            <th className={cn(HEAD, "text-center")}>Day range</th>
            <th className={cn(HEAD, "text-right")}>Volume</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const tone = (row.changePercent ?? 0) >= 0 ? "text-gain" : "text-loss";
            return (
              <tr
                key={row.symbol}
                className="border-border hover:bg-accent/60 group border-b transition-colors"
              >
                <td className="text-muted-foreground px-3 py-2.5 text-center font-mono text-[0.68rem]">
                  {String(index + 1).padStart(2, "0")}
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex items-baseline gap-2.5">
                    <span className="font-mono text-[0.72rem] font-semibold tracking-[0.1em]">
                      {row.symbol}
                    </span>
                    <span className="border-border text-muted-foreground hidden border px-1.5 py-0.5 font-mono text-[0.55rem] tracking-[0.1em] uppercase lg:inline">
                      {row.sector}
                    </span>
                    {row.error ? (
                      <span className="text-destructive font-mono text-[0.55rem] tracking-[0.12em] uppercase">
                        {row.error}
                      </span>
                    ) : null}
                  </div>
                  <p className="text-muted-foreground truncate font-serif text-[0.86rem]">
                    {row.name}
                  </p>
                </td>
                <td className={cn("px-3 py-2.5 text-right", NUMBER, "font-semibold")}>
                  {formatPrice(row.price)}
                </td>
                <td className={cn("px-3 py-2.5 text-right", NUMBER, tone)}>
                  {formatSignedPrice(row.change)}
                </td>
                <td className={cn("px-3 py-2.5 text-right", NUMBER, tone)}>
                  {directionMark(row.changePercent)} {formatPercent(row.changePercent)}
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex justify-center">
                    <RangeBar row={row} />
                  </div>
                </td>
                <td className={cn("px-3 py-2.5 text-right", NUMBER, "text-muted-foreground")}>
                  {formatVolume(row.volume)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function BoardCard({ row }: { row: BoardRow }) {
  const tone = (row.changePercent ?? 0) >= 0 ? "text-gain" : "text-loss";
  return (
    <li className="border-border border-b py-3">
      <div className="flex items-baseline justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[0.72rem] font-semibold tracking-[0.1em]">{row.symbol}</p>
          <p className="text-muted-foreground truncate font-serif text-[0.86rem]">{row.name}</p>
        </div>
        <div className="text-right">
          <p className={cn(NUMBER, "font-semibold")}>{formatPrice(row.price)}</p>
          <p className={cn(NUMBER, tone)}>
            {directionMark(row.changePercent)} {formatPercent(row.changePercent)}
          </p>
        </div>
      </div>
      <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[0.65rem]">
        <span className="border-border border px-1.5 py-0.5 tracking-[0.1em] uppercase">
          {row.sector}
        </span>
        <span>
          Chg <span className={tone}>{formatSignedPrice(row.change)}</span>
        </span>
        <span>Vol {formatVolume(row.volume)}</span>
      </div>
      <div className="mt-2">
        <RangeBar row={row} />
      </div>
    </li>
  );
}
