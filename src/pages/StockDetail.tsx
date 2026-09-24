import { AppHeader, StatusPill } from "@/components/watchdog/AppHeader";
import { KeyValue, Panel, RangeMeter } from "@/components/watchdog/Panel";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { useLiveQuotes } from "@/hooks/use-live-quotes";
import { useNow } from "@/hooks/use-now";
import { useStockResearch } from "@/hooks/use-stock-research";
import {
  directionMark,
  formatClock,
  formatPercent,
  formatPrice,
  formatRelative,
  formatSignedPrice,
  formatVolume,
  marketState,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import { useQuery } from "convex/react";
import { motion } from "framer-motion";
import { AlertTriangle, ArrowLeft, ExternalLink, RotateCw } from "lucide-react";
import { Link, useParams } from "react-router";

const PRICE = "tabular font-mono";

export default function StockDetail() {
  const { symbol: rawSymbol = "" } = useParams<{ symbol: string }>();
  const symbol = rawSymbol.toUpperCase();
  const { isAuthenticated } = useAuth();
  const now = useNow();

  const detail = useQuery(api.stock.detail, symbol ? { symbol } : "skip");
  const { isRefreshing, error: feedError, refreshNow } = useLiveQuotes(
    isAuthenticated && Boolean(symbol),
    symbol ? [symbol] : undefined,
  );

  const fundamentals = detail?.fundamentals ?? null;
  const news = detail?.news ?? null;

  const research = useStockResearch({
    symbol,
    enabled: isAuthenticated && detail !== null && detail !== undefined,
    fundamentals: {
      updatedAt: fundamentals?.updatedAt ?? null,
      hasError: Boolean(fundamentals?.error),
    },
    news: { updatedAt: news?.updatedAt ?? null, hasError: Boolean(news?.error) },
  });

  const open = marketState(new Date(now)) === "open";

  if (detail === undefined) {
    return (
      <div className="texture-grid bg-background min-h-screen">
        <AppHeader size="compact" />
        <div className="mx-auto w-full max-w-[1500px] px-4 py-10 sm:px-6">
          <div className="bg-card h-28 w-full animate-pulse" />
          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            <div className="bg-card h-72 animate-pulse lg:col-span-2" />
            <div className="bg-card h-72 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (detail === null) {
    return (
      <div className="texture-grid bg-background min-h-screen">
        <AppHeader size="compact" />
        <div className="mx-auto w-full max-w-[1500px] px-4 py-16 sm:px-6">
          <Panel title="ticker not found">
            <p className="text-muted-foreground font-mono text-sm">
              <span className="text-loss">error:</span> {symbol || "(empty)"} is not on the NSE
              Watchdog roster.
            </p>
            <Button
              asChild
              variant="outline"
              className="mt-5 rounded-none font-mono text-xs tracking-[0.1em] uppercase"
            >
              <Link to="/dashboard">
                <ArrowLeft className="size-3.5" />
                Back to the catalog
              </Link>
            </Button>
          </Panel>
        </div>
      </div>
    );
  }

  const { company, quote } = detail;
  const price = quote?.price ?? null;
  const changePercent = quote?.changePercent ?? null;
  const positive = (changePercent ?? 0) >= 0;
  const changeTone = changePercent === null || changePercent === 0 ? undefined : positive ? "gain" : "loss";

  const fiftyTwoHigh = fundamentals?.fiftyTwoWeekHigh ?? null;
  const fiftyTwoLow = fundamentals?.fiftyTwoWeekLow ?? null;
  const oneYear = fundamentals?.oneYearChangePercent ?? null;
  const ytd = fundamentals?.ytdChangePercent ?? null;

  const fromHigh =
    price !== null && fiftyTwoHigh ? (price / fiftyTwoHigh - 1) * 100 : null;
  const aboveLow =
    price !== null && fiftyTwoLow ? (price / fiftyTwoLow - 1) * 100 : null;
  const valueTraded =
    price !== null && quote?.volume ? price * quote.volume : null;

  const series = fundamentals?.series ?? [];

  return (
    <div className="texture-grid bg-background text-foreground min-h-screen">
      <AppHeader
        size="compact"
        subline={
          <span className="flex items-center gap-2">
            <Link to="/dashboard" className="hover:text-foreground transition-colors">
              catalog
            </Link>
            <span className="text-border">/</span>
            <span className="text-foreground">{company.symbol}</span>
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="hidden rounded-none font-mono text-[0.68rem] tracking-[0.1em] uppercase sm:inline-flex"
            >
              <Link to="/dashboard">
                <ArrowLeft className="size-3.5" />
                Catalog
              </Link>
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => void refreshNow()}
              disabled={isRefreshing}
              className="rounded-none font-mono text-[0.68rem] tracking-[0.1em] uppercase"
            >
              <RotateCw className={cn("size-3.5", isRefreshing && "animate-spin")} />
              {isRefreshing ? "Reading" : "Refresh"}
            </Button>
          </div>
        }
      />

      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25 }}
        className="mx-auto w-full max-w-[1500px] px-4 py-8 sm:px-6"
      >
        {feedError ? (
          <div className="border-loss/50 bg-loss/5 mb-6 flex items-start gap-3 border-l-2 px-4 py-3">
            <AlertTriangle className="text-loss mt-0.5 size-4 shrink-0" />
            <p className="font-mono text-xs leading-5">
              <span className="text-loss">feed error:</span> {feedError} Showing the last published
              levels.
            </p>
          </div>
        ) : null}

        {/* Identity + live price ------------------------------------------- */}
        <section className="border-border bg-card/40 texture-dots flex flex-wrap items-start justify-between gap-8 border p-5 sm:p-7">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="border-signal/40 bg-signal/10 text-signal label-sm border px-2 py-1">
                {company.sector}
              </span>
              <span className="label-sm text-muted-foreground">NSE · {company.symbol}</span>
              <StatusPill open={open} />
            </div>

            <h1 className="mt-4 font-mono text-3xl font-semibold tracking-[0.06em] sm:text-4xl">
              {company.symbol}
            </h1>
            <p className="text-foreground/90 mt-2 text-base">
              {fundamentals?.officialName ?? company.name}
            </p>
            {fundamentals?.industry ? (
              <p className="label-sm text-muted-foreground mt-2">{fundamentals.industry}</p>
            ) : null}
          </div>

          <div className="text-left sm:text-right">
            <p className={cn(PRICE, "text-4xl font-semibold sm:text-5xl")}>
              {price === null ? "—" : `₹${formatPrice(price)}`}
            </p>
            <p
              className={cn(
                PRICE,
                "mt-2 text-base",
                changeTone === "gain" && "text-gain",
                changeTone === "loss" && "text-loss",
                !changeTone && "text-muted-foreground",
              )}
            >
              {directionMark(changePercent)} {formatSignedPrice(quote?.change ?? null)} (
              {formatPercent(changePercent)})
            </p>
            <p className="label-sm text-muted-foreground mt-3">
              prev close {quote?.previousClose === null || quote?.previousClose === undefined ? "—" : `₹${formatPrice(quote.previousClose)}`}
            </p>
            <p className="label-sm text-muted-foreground mt-1.5">
              last read {quote?.updatedAt ? formatClock(quote.updatedAt) : "—"}
            </p>
          </div>
        </section>

        {/* Chart + key fundamentals --------------------------------------- */}
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <Panel
            className="lg:col-span-2"
            title="price history"
            meta={
              series.length > 1
                ? `1 year · daily · ${series.length} points`
                : "1 year · daily"
            }
            action={
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => void research.reloadFundamentals()}
                disabled={research.isLoadingFundamentals}
                className="rounded-none font-mono text-[0.65rem] tracking-[0.1em] uppercase"
              >
                <RotateCw
                  className={cn("size-3", research.isLoadingFundamentals && "animate-spin")}
                />
                Reload
              </Button>
            }
            bodyClassName="p-4"
          >
            <PriceHistory series={series} positive={(oneYear ?? 0) >= 0} />
            <div className="border-border mt-4 grid grid-cols-2 gap-4 border-t pt-4 sm:grid-cols-4">
              <MiniStat label="1-year return" value={formatPercent(oneYear)} tone={oneYear} />
              <MiniStat label="year to date" value={formatPercent(ytd)} tone={ytd} />
              <MiniStat label="52-week high" value={formatPrice(fiftyTwoHigh)} prefix="₹" />
              <MiniStat label="52-week low" value={formatPrice(fiftyTwoLow)} prefix="₹" />
            </div>
          </Panel>

          <Panel
            title="key fundamentals"
            meta={fundamentals ? `read ${formatRelative(fundamentals.updatedAt, now)}` : "loading"}
            action={
              research.isLoadingFundamentals ? (
                <span className="label-sm text-primary">fetching…</span>
              ) : null
            }
          >
            <KeyValue
              label="last traded"
              value={price === null ? "—" : `₹${formatPrice(price)}`}
            />
            <KeyValue
              label="previous close"
              value={
                quote?.previousClose === null || quote?.previousClose === undefined
                  ? "—"
                  : `₹${formatPrice(quote.previousClose)}`
              }
            />
            <KeyValue
              label="day change"
              value={`${directionMark(changePercent)} ${formatSignedPrice(quote?.change ?? null)}`}
              note={formatPercent(changePercent)}
              tone={changeTone}
            />
            <KeyValue
              label="day range"
              value={`₹${formatPrice(quote?.dayLow)} – ₹${formatPrice(quote?.dayHigh)}`}
            />
            <KeyValue
              label="volume today"
              value={formatVolume(quote?.volume ?? null)}
            />
            <KeyValue
              label="avg volume 30d"
              value={formatVolume(fundamentals?.averageVolume30d ?? null)}
            />
            <KeyValue
              label="value traded"
              value={valueTraded === null ? "—" : `₹${formatVolume(valueTraded)}`}
            />
            <KeyValue
              label="52-week high"
              value={fiftyTwoHigh === null ? "—" : `₹${formatPrice(fiftyTwoHigh)}`}
              note={fromHigh === null ? undefined : `${formatPercent(fromHigh)} from high`}
            />
            <KeyValue
              label="52-week low"
              value={fiftyTwoLow === null ? "—" : `₹${formatPrice(fiftyTwoLow)}`}
              note={aboveLow === null ? undefined : `${formatPercent(aboveLow)} above low`}
            />

            <div className="pt-3">
              <div className="flex items-baseline justify-between gap-3">
                <span className="label-sm text-muted-foreground">52-week position</span>
                <span className="tabular font-mono text-xs text-muted-foreground">
                  {fiftyTwoLow === null || fiftyTwoHigh === null
                    ? "—"
                    : `${formatPrice(fiftyTwoLow)} – ${formatPrice(fiftyTwoHigh)}`}
                </span>
              </div>
              <div className="mt-2.5">
                <RangeMeter low={fiftyTwoLow} high={fiftyTwoHigh} value={price} />
              </div>
            </div>

            {fundamentals?.error ? (
              <p className="text-loss label-sm mt-3">{fundamentals.error}</p>
            ) : null}
          </Panel>
        </div>

        {/* Recent headlines ------------------------------------------------ */}
        <Panel
          className="mt-6"
          title="recent headlines"
          meta={
            news
              ? `${news.items.length} items · read ${formatRelative(news.updatedAt, now)}`
              : "loading"
          }
          action={
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => void research.reloadNews()}
              disabled={research.isLoadingNews}
              className="rounded-none font-mono text-[0.65rem] tracking-[0.1em] uppercase"
            >
              <RotateCw className={cn("size-3", research.isLoadingNews && "animate-spin")} />
              Reload
            </Button>
          }
          bodyClassName="p-0"
        >
          {research.isLoadingNews && (!news || news.items.length === 0) ? (
            <div className="divide-border divide-y">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="px-4 py-3.5">
                  <div className="bg-muted h-4 w-3/4 animate-pulse" />
                  <div className="bg-muted mt-2 h-3 w-32 animate-pulse" />
                </div>
              ))}
            </div>
          ) : news && news.items.length > 0 ? (
            <ul className="divide-border divide-y">
              {news.items.map((item) => (
                <li key={`${item.url}-${item.title}`}>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:bg-accent/50 group flex items-start justify-between gap-4 px-4 py-3.5 transition-colors"
                  >
                    <span className="min-w-0">
                      <span className="text-foreground group-hover:text-primary block text-sm leading-6 transition-colors">
                        {item.title}
                      </span>
                      <span className="label-sm text-muted-foreground mt-1.5 block">
                        {item.source}
                        {item.publishedAt ? ` · ${formatRelative(item.publishedAt, now)}` : ""}
                      </span>
                    </span>
                    <ExternalLink className="text-muted-foreground group-hover:text-primary mt-1 size-3.5 shrink-0 transition-colors" />
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-4 py-8 text-center">
              <p className="text-muted-foreground font-mono text-xs">
                {news?.error
                  ? `newswire error: ${news.error}`
                  : "No recent headlines found for this company."}
              </p>
            </div>
          )}
        </Panel>

        <footer className="border-border text-muted-foreground mt-10 border-t pt-4 font-mono text-[0.7rem] leading-6">
          <p>
            <span className="text-foreground">note:</span> fundamentals are derived from one year of
            real NSE price history; headlines are pulled from a public Indian news feed and link to
            the original publishers. Levels are indicative and may be delayed outside market hours
            (09:15–15:30 IST, Monday to Friday). Personal reference only — not investment advice.
          </p>
        </footer>
      </motion.main>
    </div>
  );
}

function MiniStat({
  label,
  value,
  tone,
  prefix = "",
}: {
  label: string;
  value: string;
  tone?: number | null;
  prefix?: string;
}) {
  return (
    <div>
      <p className="label-sm text-muted-foreground">{label}</p>
      <p
        className={cn(
          PRICE,
          "mt-1.5 text-sm",
          tone === null || tone === undefined || tone === 0
            ? "text-foreground"
            : tone > 0
              ? "text-gain"
              : "text-loss",
        )}
      >
        {prefix && value !== "—" ? `${prefix}${value}` : value}
      </p>
    </div>
  );
}

/** Inline SVG so the chart ships without a charting dependency. */
function PriceHistory({
  series,
  positive,
}: {
  series: { t: number; c: number }[];
  positive: boolean;
}) {
  if (series.length < 2) {
    return (
      <div className="border-border label-sm text-muted-foreground flex h-56 items-center justify-center border border-dashed">
        awaiting price history
      </div>
    );
  }

  const W = 760;
  const H = 240;
  const PAD = 12;
  const values = series.map((point) => point.c);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const innerWidth = W - PAD * 2;
  const innerHeight = H - PAD * 2;
  const step = innerWidth / (series.length - 1);

  const x = (index: number) => PAD + index * step;
  const y = (close: number) => PAD + innerHeight * (1 - (close - min) / span);

  const line = series
    .map((point, index) => `${x(index).toFixed(1)},${y(point.c).toFixed(1)}`)
    .join(" ");
  const area = `${PAD},${H - PAD} ${line} ${(PAD + innerWidth).toFixed(1)},${H - PAD}`;
  const stroke = positive ? "var(--gain)" : "var(--loss)";

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="h-56 w-full"
        role="img"
        aria-label="One year price history"
      >
        {[0, 1, 2, 3, 4].map((index) => {
          const gridY = PAD + (innerHeight / 4) * index;
          return (
            <line
              key={index}
              x1={PAD}
              x2={W - PAD}
              y1={gridY}
              y2={gridY}
              stroke="var(--border)"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          );
        })}
        <polygon points={area} fill={stroke} opacity="0.12" />
        <polyline
          points={line}
          fill="none"
          stroke={stroke}
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <span className="label-sm text-muted-foreground absolute top-1 right-1 bg-background px-1">
        {formatPrice(max)}
      </span>
      <span className="label-sm text-muted-foreground absolute right-1 bottom-1 bg-background px-1">
        {formatPrice(min)}
      </span>
      <span className="label-sm text-muted-foreground absolute bottom-1 left-1 bg-background px-1">
        1y ago
      </span>
      <span className="label-sm text-muted-foreground absolute top-1 left-1 bg-background px-1">
        now
      </span>
    </div>
  );
}
