import { api } from "@/convex/_generated/api";
import { useAction } from "convex/react";
import { useCallback, useEffect, useRef, useState } from "react";

/** A note built on last week's tape is already out of date. */
const NOTE_TTL_MS = 6 * 60 * 60 * 1000;
/** After a failure, wait this long before trying again instead of looping. */
const RETRY_AFTER_FAILURE_MS = 60 * 1000;

/**
 * Writes the Gemini desk note for one company.
 *
 * Notes are cached in Convex, so this only calls the model when the cached
 * copy is missing or older than its TTL — a page view on a company that
 * already has a note costs nothing. Writes land in the database, so the
 * reactive detail query re-renders on its own.
 */
export function useDeskNote({
  symbol,
  enabled,
  note,
}: {
  symbol: string;
  enabled: boolean;
  note: { updatedAt: number | null; hasBody: boolean; hasError: boolean };
}) {
  const writeNote = useAction(api.deskNote.writeNote);

  const [isWriting, setIsWriting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);

  const run = useCallback(
    async (force = false) => {
      if (!enabled || !symbol || inFlight.current) return;

      if (!force) {
        if (note.updatedAt === null) {
          // Nothing on file yet, or the row was cleared — write the first note.
        } else if (note.hasError && !note.hasBody) {
          // A failed attempt is already on file: wait before trying again.
          if (Date.now() - note.updatedAt < RETRY_AFTER_FAILURE_MS) return;
        } else if (note.hasBody && Date.now() - note.updatedAt < NOTE_TTL_MS) {
          return;
        }
      }

      inFlight.current = true;
      setIsWriting(true);
      try {
        const result = await writeNote({ symbol });
        if (result?.ok) setError(null);
        else setError(result?.error ?? "The desk note could not be written.");
      } catch (err) {
        setError(
          err instanceof Error && err.message ? err.message : "The desk note could not be written.",
        );
      } finally {
        inFlight.current = false;
        setIsWriting(false);
      }
    },
    [enabled, note.hasBody, note.hasError, note.updatedAt, symbol, writeNote],
  );

  useEffect(() => {
    void run();
  }, [run]);

  return { isWriting, error, writeNote: () => run(true) };
}
