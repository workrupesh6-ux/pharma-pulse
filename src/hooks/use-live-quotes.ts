import { api } from "@/convex/_generated/api";
import { useAction } from "convex/react";
import { useCallback, useEffect, useRef, useState } from "react";

/** The tape re-reads the market a little faster than a print run. */
export const REFRESH_INTERVAL_MS = 20_000;

/**
 * Keeps the cached quote table fresh.
 *
 * The board itself is a reactive Convex query, so this hook only has to trigger
 * the fetch — new prices flow back to every subscribed reader automatically.
 * Polling pauses while the tab is hidden and resumes on focus.
 */
export function useLiveQuotes(enabled: boolean, symbols?: string[]) {
  const refreshAction = useAction(api.quotes.refresh);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const inFlight = useRef(false);

  // A stable string key keeps the callback identity from changing every render.
  const symbolKey = symbols && symbols.length > 0 ? symbols.join(",") : "";

  const refreshNow = useCallback(async () => {
    if (inFlight.current) return;
    if (typeof document !== "undefined" && document.visibilityState === "hidden") return;

    inFlight.current = true;
    setIsRefreshing(true);
    try {
      await refreshAction(symbolKey ? { symbols: symbolKey.split(",") } : {});
      setError(null);
      setLastSyncedAt(Date.now());
    } catch (err) {
      setError(
        err instanceof Error && err.message
          ? err.message
          : "The live feed is unavailable right now.",
      );
    } finally {
      inFlight.current = false;
      setIsRefreshing(false);
    }
  }, [refreshAction, symbolKey]);

  useEffect(() => {
    if (!enabled) return;

    void refreshNow();
    const interval = window.setInterval(() => void refreshNow(), REFRESH_INTERVAL_MS);
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void refreshNow();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [enabled, refreshNow]);

  return { isRefreshing, error, lastSyncedAt, refreshNow };
}
