import { useEffect, useState } from "react";

/**
 * A clock that re-renders on an interval so relative timestamps ("4m ago") stay
 * honest while a page sits open.
 */
export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);

  return now;
}
