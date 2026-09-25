import { AppHeader, StatusPill } from "@/components/watchdog/AppHeader";
import { LiveTicker } from "@/components/watchdog/LiveTicker";
import { RangeMeter } from "@/components/watchdog/Panel";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { REFRESH_INTERVAL_MS, useLiveQuotes } from "@/hooks/use-live-quotes";
import { useNow } from "@/hooks/use-now";
import {
  SECTORS,
  SORT_OPTIONS,
  rollUpBySector,
  sortBoard,
  summarize,
  type BoardRow,
  type SectorRollup,
  type SortKey,
} from "@/lib/board";
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
import { useAction, useQuery } from "convex/react";
import { motion } from "framer-motion";
import { AlertTriangle, ChevronRight, Database, LogOut, RotateCw, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";

const NUM = "tabular font-mono text-[0.8rem]";

export default function Dashboard() {
  const { user, isAuthenticated, signOut } = useAuth();
  const navigate = useNavigate();
  const now = useNow(1000 * 10);

  const board = useQuery(api.pharma.list);
  const syncCoverage = useAction(api.universe.sync);
  const { isRefreshing, error, refreshNow } = useLiveQuotes(isAuthenticated);

  const [search, setSearch] = useState("");
  const [sector, setSector] = useState<string>(SECTORS[0]);
  const [sortKey, setSortKey] = useState<SortKey>("change-desc");
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const open = marketState(new Date(now)) === "open";
  const companies = useMemo(() => board?.companies ?? [], [board]);
  const summary = summarize(companies);
  const rollups = useMemo(() => rollUpBySector(companies), [companies]);
  const quotesUpdatedAt = board?.quotesUpdatedAt ?? null;
  const coverage = board?.coverage ?? null;
  const synced = board?.rosterSource === "nse-master";

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

  /**
   * Re-reads the coverage sources and rebuilds the roster from them: the
   * TradingView industry screen for what each company does, the exchange's
   * equity master for what is actually listed, and the keyword pass for the
   * names neither of those caught. Deliberately out of the twenty-second quote
   * loop — a sweep pulls a whole sector and a whole listed-company file — but
   * it runs once by itself on the first visit, so the desk starts at full
   * width instead of at the curated seed.
   */
  const handleSyncCoverage = useCallback(async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setSyncMessage(null);
    try {
      const result = await syncCoverage({});
      setSyncMessage(
        result.ok
          ? `Swept ${result.equityListings} NSE listings — ${result.screened} filed by TradingView industry, ${result.matched} by keyword — ${result.added} added, ${result.retired} retired, ${result.rejected} set aside by industry.`
          : `Sweep failed: ${result.error ?? "the NSE equity master was unreachable"}.`,
      );
    } catch (err) {
      setSyncMessage(
        err instanceof Error && err.message
          ? err.message
          : "The coverage sweep could not be completed.",
      );
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, syncCoverage]);

  // The desk should not sit on the seed list just because nobody pressed a
  // button. A failed sweep still records a coverage row, so this runs at most
  // once and never loops.
  const autoSynced = useRef(false);
  useEffect(() => {
    if (!isAuthenticated || autoSynced.current || board === undefined) return;
    if (board.coverage) return;
    autoSynced.current = true;
    void handleSyncCoverage();
  }, [board, handleSyncCoverage, isAuthenticated]);

  return (
    <div className="texture-grid bg-background text-foreground min-h-screen">
      <AppHeader
        size="compact"
        actions={
          <div className="flex items-center gap-2">
            {user?.name || user?.email ? (
              <span className="label-sm text-muted-foreground hidden lg:inline">
                {user.name ?? user.email}
              </span>
            ) : null}
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleSignOut}
              className="rounded-none font-mono text-[0.68rem] tracking-[0.1em] uppercase"
            >
              <LogOut className="size-3.5" />
              Sign out
            </Button>
          </div>
        }
      />

      <LiveTicker companies={companies} />

      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25 }}
        className="mx-auto w-full max-w-[1500px] px-4 pb-16 sm:px-6"
      >
        {/* Desk head ------------------------------------------------------- */}
        <div className="border-border mt-8 flex flex-wrap items-end justify-between gap-5 border-b pb-5">
          <div>
            <p className="label text-primary">pharma stalker · nse</p>
            <h1 className="mt-3 font-mono text-3xl font-semibold tracking-[0.08em] sm:text-4xl">
              Pharma Catalog
            </h1>
            <p className="text-muted-foreground mt-3 max-w-2xl font-mono text-xs leading-6">
              Search, sort and open any covered pharmaceutical ticker. Every{" "}
              {Math.round(REFRESH_INTERVAL_MS / 1000)} seconds the desk re-reads the stalest slice of
              the roster, so the whole shelf is refreshed continuously while this page is open.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <StatusPill open={open} />
            <span className="label-sm text-muted-foreground">
              {quotesUpdatedAt ? `tape read ${formatClock(quotesUpdatedAt)}` : "no tape yet"}
            </span>
            <Button
              type="button"
              size="sm"
              onClick={() => void refreshNow()}
              disabled={isRefreshing}
              className="rounded-none font-mono text-[0.68rem] tracking-[0.1em] uppercase"
            >
              <RotateCw className={cn("size-3.5", isRefreshing && "animate-spin")} />
              {isRefreshing ? "Reading" : "Refresh"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => void handleSyncCoverage()}
              disabled={isSyncing}
              className="rounded-none font-mono text-[0.68rem] tracking-[0.1em] uppercase"
            >
              <Database className={cn("size-3.5", isSyncing && "animate-pulse")} />
              {isSyncing ? "Sweeping" : "Sync coverage"}
            </Button>
          </div>
        </div>

        {/* Coverage -------------------------------------------------------- */}
        <div className="border-primary/50 text-muted-foreground mt-5 flex flex-wrap items-baseline gap-x-2 gap-y-1 border-l-2 pl-4 font-mono text-[0.7rem] leading-6">
          <span className="label-sm text-foreground">coverage</span>
          <span aria-hidden="true">·</span>
          <span>{synced ? "auto-synced · tradingview screen + nse master" : "curated seed roster"}</span>
          {coverage && coverage.ok ? (
            <>
              <span aria-hidden="true">·</span>
              <span>
                {coverage.equityListings} NSE listings, {coverage.matched} by keyword
              </span>
              {coverage.screened > 0 ? (
                <>
                  <span aria-hidden="true">·</span>
                  <span title="Names TradingView's Indian industry classification files under Pharmaceuticals or Biotechnology.">
                    {coverage.screened} screened by industry
                  </span>
                </>
              ) : null}
              {coverage.rejected > 0 ? (
                <>
                  <span aria-hidden="true">·</span>
                  <span title="Names whose registered name reads as pharmaceutical but whose quoted industry is not — agrochemicals, speciality chemicals, animal feed.">
                    {coverage.rejected} set aside by industry
                  </span>
                </>
              ) : null}
            </>
          ) : null}
          <span aria-hidden="true">·</span>
          <span>{coverage ? `swept ${formatClock(coverage.updatedAt)}` : "never swept"}</span>
          {coverage && !coverage.ok ? (
            <>
              <span aria-hidden="true">·</span>
              <span className="text-loss">last sweep failed</span>
            </>
          ) : null}
        </div>

        {syncMessage ? (
          <p className="text-muted-foreground mt-2 pl-4 font-mono text-[0.7rem] leading-6">
            {syncMessage}
          </p>
        ) : null}

        {error ? (
          <div className="border-loss/50 bg-loss/5 mt-5 flex items-start gap-3 border-l-2 px-4 py-3">
            <AlertTriangle className="text-loss mt-0.5 size-4 shrink-0" />
            <p className="font-mono text-xs leading-5">
              <span className="text-loss">feed error:</span> {error} Showing the last published
              levels.
            </p>
          </div>
        ) : null}

        {/* Breadth -------------------------------------------------------- */}
        <section className="border-border mt-8 grid gap-px border bg-border sm:grid-cols-2 lg:grid-cols-4">
          <Tile
            label="names covered"
            value={String(companies.length)}
            note={synced ? "auto-synced nse listings" : "curated seed roster"}
          />
          <Tile
            label="advancing"
            value={String(summary.advancing)}
            note={`of ${summary.quoted} quoting`}
            tone="gain"
          />
          <Tile label="declining" value={String(summary.declining)} note="on the day" tone="loss" />
          <div className="bg-card/40 p-5">
            <p className="label-sm text-muted-foreground">session breadth</p>
            <div className="bg-muted mt-4 flex h-2.5 w-full overflow-hidden">
              <div
                className="bg-gain"
                style={{
                  width: `${
                    summary.quoted > 0 ? (summary.advancing / summary.quoted) * 100 : 50
                  }%`,
                }}
              />
              <div
                className="bg-loss"
                style={{
                  width: `${
                    summary.quoted > 0 ? (summary.declining / summary.quoted) * 100 : 50
                  }%`,
                }}
              />
            </div>
            <div className="mt-5 grid grid-cols-2 gap-4">
              <Mover label="best" row={summary.topGainer} />
              <Mover label="worst" row={summary.topLoser} />
            </div>
          </div>
        </section>

        {/* Desk rollup ---------------------------------------------------- */}
        <section className="border-border mt-6 border">
          <div className="border-border flex flex-wrap items-center justify-between gap-3 border-b px-4 py-2.5">
            <h2 className="label text-foreground">desk rollup</h2>
            <span className="label-sm text-muted-foreground">
              breadth · avg move · best / worst · select to filter
            </span>
          </div>
          <div className="grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {rollups.map((rollup) => (
              <DeskCard
                key={rollup.sector}
                rollup={rollup}
                active={sector === rollup.sector}
                onToggle={() =>
                  setSector(sector === rollup.sector ? SECTORS[0] : rollup.sector)
                }
              />
            ))}
          </div>
        </section>

        {/* Controls ------------------------------------------------------- */}
        <div className="border-border mt-6 flex flex-wrap items-center gap-3 border-b pb-4">
          <div className="relative min-w-[240px] flex-1">
            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search a company name or NSE symbol"
              aria-label="Search the catalog"
              className="border-input bg-card/60 placeholder:text-muted-foreground focus-visible:border-primary h-10 w-full rounded-none border pr-3 pl-9 font-mono text-xs outline-none"
            />
          </div>

          <label className="flex items-center gap-2">
            <span className="label-sm text-muted-foreground">sector</span>
            <select
              value={sector}
              onChange={(event) => setSector(event.target.value)}
              className="border-input bg-card/60 focus-visible:border-primary h-10 rounded-none border px-3 font-mono text-[0.7rem] outline-none"
            >
              {SECTORS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-2">
            <span className="label-sm text-muted-foreground">order</span>
            <select
              value={sortKey}
              onChange={(event) => setSortKey(event.target.value as SortKey)}
              className="border-input bg-card/60 focus-visible:border-primary h-10 rounded-none border px-3 font-mono text-[0.7rem] outline-none"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <span className="label-sm text-muted-foreground ml-auto">
            {rows.length} {rows.length === 1 ? "result" : "results"}
          </span>
        </div>

        {awaitingFirstTape ? (
          <p className="border-border text-muted-foreground mt-5 border-l-2 pl-4 font-mono text-xs">
            First tape run in progress — the roster is read in batches, so prices fill in over the
            first minute or so.
          </p>
        ) : null}

        {/* Results -------------------------------------------------------- */}
        {isLoading ? (
          <div className="mt-6 space-y-2">
            {Array.from({ length: 10 }).map((_, index) => (
              <div key={index} className="bg-card/60 h-12 w-full animate-pulse" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="border-border mt-6 border py-16 text-center">
            <p className="font-mono text-sm">No tickers match that query.</p>
            <p className="text-muted-foreground mt-2 font-mono text-xs">
              Try another symbol or widen the sector filter.
            </p>
            <Button
              type="button"
              variant="outline"
              className="mt-5 rounded-none font-mono text-[0.68rem] tracking-[0.1em] uppercase"
              onClick={() => {
                setSearch("");
                setSector(SECTORS[0]);
              }}
            >
              Reset filters
            </Button>
          </div>
        ) : (
          <>
            <CatalogTable rows={rows} />

            <ul className="border-border mt-6 border md:hidden">
              {rows.map((row) => (
                <CatalogCard key={row.symbol} row={row} />
              ))}
            </ul>
          </>
        )}

        <footer className="border-border text-muted-foreground mt-12 border-t pt-4 font-mono text-[0.7rem] leading-6">
          <p>
            <span className="text-foreground">note:</span> levels are indicative and may be delayed
            outside NSE cash-market hours (09:15–15:30 IST, Monday to Friday, holidays excepted).
            Coverage is screened with TradingView's Indian industry classification and crossed
            against NSE's own equity master file, with a keyword pass over registered names as the
            fallback — so an unusual name can still slip through in either direction. Re-run Sync
            coverage to re-read both. Scope is pharmaceutical manufacturers;
            hospital, diagnostic-lab and medical-device listings are not tracked. Personal
            reference only — not investment advice.
          </p>
        </footer>
      </motion.main>
    </div>
  );
}

function Tile({
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
    <div className="bg-card/40 p-5">
      <p className="label-sm text-muted-foreground">{label}</p>
      <p
        className={cn(
          "tabular mt-3 font-mono text-3xl font-semibold",
          tone === "gain" && "text-gain",
          tone === "loss" && "text-loss",
        )}
      >
        {value}
      </p>
      <p className="label-sm text-muted-foreground mt-2">{note}</p>
    </div>
  );
}

function Mover({ label, row }: { label: string; row: BoardRow | null }) {
  return (
    <div>
      <p className="label-sm text-muted-foreground">{label}</p>
      {row ? (
        <>
          <p className="mt-1.5 font-mono text-xs font-medium tracking-[0.08em]">{row.symbol}</p>
          <p
            className={cn(
              NUM,
              "mt-1 text-xs",
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

function DeskCard({
  rollup,
  active,
  onToggle,
}: {
  rollup: SectorRollup;
  active: boolean;
  onToggle: () => void;
}) {
  const breadthShare = rollup.quoted > 0 ? (rollup.advancing / rollup.quoted) * 100 : 50;
  const average = rollup.averageChangePercent;

  return (
    <div className={cn("bg-background p-4 transition-colors", active && "bg-accent/30")}>
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={active}
        className="group flex w-full items-center justify-between gap-2 text-left"
      >
        <span
          className={cn(
            "label transition-colors group-hover:text-primary",
            active ? "text-primary" : "text-foreground",
          )}
        >
          {rollup.sector}
        </span>
        <span className="label-sm text-muted-foreground">
          {rollup.quoted}/{rollup.total}
        </span>
      </button>

      <div className="bg-muted mt-3.5 flex h-1.5 overflow-hidden">
        <div className="bg-gain" style={{ width: `${breadthShare}%` }} />
        <div className="bg-loss" style={{ width: `${100 - breadthShare}%` }} />
      </div>

      <div className="label-sm mt-2 flex items-center justify-between">
        <span className="text-gain">▲ {rollup.advancing}</span>
        <span className="text-loss">▼ {rollup.declining}</span>
        <span className="text-muted-foreground">— {rollup.unchanged}</span>
      </div>

      <div className="border-border mt-3.5 flex items-baseline justify-between gap-3 border-t pt-3">
        <span className="label-sm text-muted-foreground">avg move</span>
        <span
          className={cn(
            "tabular font-mono text-xs",
            average === null || average === 0
              ? "text-muted-foreground"
              : average > 0
                ? "text-gain"
                : "text-loss",
          )}
        >
          {formatPercent(average)}
        </span>
      </div>

      <div className="border-border mt-2.5 flex items-baseline justify-between gap-3 border-t pt-2.5">
        <span className="label-sm text-muted-foreground">best</span>
        <RollupMover row={rollup.best} />
      </div>

      <div className="border-border mt-2 flex items-baseline justify-between gap-3 border-t pt-2">
        <span className="label-sm text-muted-foreground">worst</span>
        <RollupMover row={rollup.worst} />
      </div>
    </div>
  );
}

function RollupMover({ row }: { row: BoardRow | null }) {
  if (!row) return <span className="text-muted-foreground font-mono text-xs">—</span>;

  const positive = (row.changePercent ?? 0) >= 0;

  return (
    <Link
      to={`/stock/${row.symbol}`}
      className="hover:text-primary flex items-baseline gap-1.5 transition-colors"
    >
      <span className="font-mono text-[0.68rem] tracking-[0.08em]">{row.symbol}</span>
      <span
        className={cn(
          "tabular font-mono text-[0.68rem]",
          positive ? "text-gain" : "text-loss",
        )}
      >
        {formatPercent(row.changePercent)}
      </span>
    </Link>
  );
}

const HEAD =
  "sticky top-0 z-10 bg-background border-border border-b px-3 py-2.5 font-mono text-[0.6rem] font-medium uppercase tracking-[0.14em] text-muted-foreground whitespace-nowrap";

function CatalogTable({ rows }: { rows: BoardRow[] }) {
  return (
    <div className="border-border mt-4 hidden overflow-x-auto border md:block md:max-h-[72vh] md:overflow-y-auto">
      <table className="w-full min-w-[980px] border-collapse text-left">
        <thead>
          <tr>
            <th className={cn(HEAD, "w-10 text-center")}>#</th>
            <th className={HEAD}>company</th>
            <th className={cn(HEAD, "text-right")}>ltp ₹</th>
            <th className={cn(HEAD, "text-right")}>chg ₹</th>
            <th className={cn(HEAD, "text-right")}>chg %</th>
            <th className={cn(HEAD, "text-center")}>day range</th>
            <th className={cn(HEAD, "text-right")}>volume</th>
            <th className={cn(HEAD, "w-10")} />
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const tone = (row.changePercent ?? 0) >= 0 ? "text-gain" : "text-loss";
            return (
              <tr
                key={row.symbol}
                className="border-border hover:bg-accent/40 group border-b transition-colors"
              >
                <td className="text-muted-foreground px-3 py-2.5 text-center font-mono text-[0.68rem]">
                  {String(index + 1).padStart(2, "0")}
                </td>
                <td className="px-3 py-2.5">
                  <Link to={`/stock/${row.symbol}`} className="block">
                    <span className="flex items-center gap-2.5">
                      <span className="group-hover:text-primary font-mono text-[0.72rem] font-medium tracking-[0.08em] transition-colors">
                        {row.symbol}
                      </span>
                      <span className="border-border text-muted-foreground hidden border px-1.5 py-0.5 font-mono text-[0.55rem] tracking-[0.1em] uppercase xl:inline">
                        {row.sector}
                      </span>
                      {row.error ? (
                        <span className="text-loss font-mono text-[0.55rem] tracking-[0.1em] uppercase">
                          {row.error}
                        </span>
                      ) : null}
                    </span>
                    <span className="text-muted-foreground block truncate text-xs">
                      {row.name}
                    </span>
                  </Link>
                </td>
                <td className={cn("px-3 py-2.5 text-right", NUM, "font-medium text-foreground")}>
                  {formatPrice(row.price)}
                </td>
                <td className={cn("px-3 py-2.5 text-right", NUM, tone)}>
                  {formatSignedPrice(row.change)}
                </td>
                <td className={cn("px-3 py-2.5 text-right", NUM, tone)}>
                  {directionMark(row.changePercent)} {formatPercent(row.changePercent)}
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center justify-center gap-2">
                    <span className="tabular text-muted-foreground w-14 text-right font-mono text-[0.68rem]">
                      {formatPrice(row.dayLow)}
                    </span>
                    <RangeMeter
                      low={row.dayLow}
                      high={row.dayHigh}
                      value={row.price}
                      className="w-16"
                    />
                    <span className="tabular text-muted-foreground w-14 font-mono text-[0.68rem]">
                      {formatPrice(row.dayHigh)}
                    </span>
                  </div>
                </td>
                <td className={cn("px-3 py-2.5 text-right", NUM, "text-muted-foreground")}>
                  {formatVolume(row.volume)}
                </td>
                <td className="px-3 py-2.5 text-right">
                  <Link to={`/stock/${row.symbol}`} aria-label={`Open ${row.name}`}>
                    <ChevronRight className="text-muted-foreground group-hover:text-primary size-4 transition-colors" />
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function CatalogCard({ row }: { row: BoardRow }) {
  const tone = (row.changePercent ?? 0) >= 0 ? "text-gain" : "text-loss";
  return (
    <li className="border-border border-b last:border-b-0">
      <Link to={`/stock/${row.symbol}`} className="hover:bg-accent/40 group block px-4 py-3.5">
        <div className="flex items-baseline justify-between gap-3">
          <div className="min-w-0">
            <p className="group-hover:text-primary font-mono text-[0.72rem] font-medium tracking-[0.08em]">
              {row.symbol}
            </p>
            <p className="text-muted-foreground truncate text-xs">{row.name}</p>
          </div>
          <div className="text-right">
            <p className={cn(NUM, "font-medium")}>{formatPrice(row.price)}</p>
            <p className={cn(NUM, tone)}>
              {directionMark(row.changePercent)} {formatPercent(row.changePercent)}
            </p>
          </div>
        </div>
        <div className="text-muted-foreground label-sm mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="border-border border px-1.5 py-1">{row.sector}</span>
          <span>
            chg <span className={tone}>{formatSignedPrice(row.change)}</span>
          </span>
          <span>vol {formatVolume(row.volume)}</span>
        </div>
        <div className="mt-3">
          <RangeMeter low={row.dayLow} high={row.dayHigh} value={row.price} />
        </div>
      </Link>
    </li>
  );
}
