import { api } from "@/convex/_generated/api";
import { useAction } from "convex/react";
import { useCallback, useEffect, useRef, useState } from "react";

/** A year of price history barely moves; headlines go stale in minutes. */
const FUNDAMENTALS_TTL_MS = 6 * 60 * 60 * 1000;
const NEWS_TTL_MS = 30 * 60 * 1000;
/** After a failure, wait this long before trying again instead of looping. */
const RETRY_AFTER_FAILURE_MS = 60 * 1000;

function isStale(updatedAt: number | null, hasError: boolean, ttl: number): boolean {
  if (!updatedAt) return true;
  const age = Date.now() - updatedAt;
  return hasError ? age > RETRY_AFTER_FAILURE_MS : age > ttl;
}

type Cached = { updatedAt: number | null; hasError: boolean };

/**
 * Loads the detail page's research on demand.
 *
 * Both fetches are cached in Convex, so this only fires when the cached copy is
 * older than its TTL — or, after a failure, once a minute. Writes land in the
 * database, so the reactive detail query re-renders on its own.
 */
export function useStockResearch({
  symbol,
  enabled,
  fundamentals,
  news,
}: {
  symbol: string;
  enabled: boolean;
  fundamentals: Cached;
  news: Cached;
}) {
  const loadFundamentals = useAction(api.research.refreshFundamentals);
  const loadNews = useAction(api.research.refreshNews);

  const [isLoadingFundamentals, setIsLoadingFundamentals] = useState(false);
  const [isLoadingNews, setIsLoadingNews] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fundamentalsInFlight = useRef(false);
  const newsInFlight = useRef(false);

  const runFundamentals = useCallback(
    async (force = false) => {
      if (!enabled || fundamentalsInFlight.current) return;
      if (!force && !isStale(fundamentals.updatedAt, fundamentals.hasError, FUNDAMENTALS_TTL_MS)) {
        return;
      }

      fundamentalsInFlight.current = true;
      setIsLoadingFundamentals(true);
      try {
        await loadFundamentals({ symbol });
        setError(null);
      } catch (err) {
        setError(err instanceof Error && err.message ? err.message : "Fundamentals unavailable.");
      } finally {
        fundamentalsInFlight.current = false;
        setIsLoadingFundamentals(false);
      }
    },
    [enabled, fundamentals.hasError, fundamentals.updatedAt, loadFundamentals, symbol],
  );

  const runNews = useCallback(
    async (force = false) => {
      if (!enabled || newsInFlight.current) return;
      if (!force && !isStale(news.updatedAt, news.hasError, NEWS_TTL_MS)) return;

      newsInFlight.current = true;
      setIsLoadingNews(true);
      try {
        await loadNews({ symbol });
      } catch (err) {
        setError(err instanceof Error && err.message ? err.message : "Headlines unavailable.");
      } finally {
        newsInFlight.current = false;
        setIsLoadingNews(false);
      }
    },
    [enabled, loadNews, news.hasError, news.updatedAt, symbol],
  );

  useEffect(() => {
    void runFundamentals();
  }, [runFundamentals]);

  useEffect(() => {
    void runNews();
  }, [runNews]);

  return {
    isLoadingFundamentals,
    isLoadingNews,
    error,
    reloadFundamentals: () => runFundamentals(true),
    reloadNews: () => runNews(true),
  };
}
