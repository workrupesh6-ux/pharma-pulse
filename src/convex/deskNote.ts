"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api, internal } from "./_generated/api";

/**
 * The desk note.
 *
 * Gemini is handed one company's own cached facts — live quote, key
 * fundamentals and the headlines already on file — and asked for a short desk
 * read of them. It is not asked to look anything up: the note may only
 * describe the numbers and headlines in front of it, and it has to say when
 * the data is thin. That keeps the output checkable against the panels above
 * it on the page.
 *
 * The call is made straight to the Gemini API over `fetch`, so the deployment
 * needs nothing but the API key, set in the project's Keys tab. Either of the
 * two names Google's own tooling uses will do — `GEMINI_API_KEY` or
 * `GOOGLE_API_KEY`. Results are cached in Convex and only rewritten on
 * request, so browsing the board never burns tokens on its own.
 */
const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";
/** Flash is the sensible cost/latency point for a short per-ticker note. */
const MODEL = "gemini-3.8-flash";
/**
 * Gemini 3 reasons before it answers, and the thinking tokens come out of the
 * same budget as the note, so leave generous headroom above ~300 words.
 */
const MAX_OUTPUT_TOKENS = 4096;
const REQUEST_TIMEOUT_MS = 60_000;
const MAX_BODY_LENGTH = 4000;
const MAX_HEADLINES = 8;

const SYSTEM_PROMPT = `You are the duty analyst on an Indian equity research desk that covers NSE-listed pharmaceutical companies.

You will be given one company's cached market data: its last traded price and day change, 52-week range, one-year and year-to-date returns, average volume, and the headlines currently on file.

Rules:
- Use only the facts supplied. Never invent prices, filings, regulatory approvals, trial results, guidance or analyst estimates. If a number is missing, write "not on file".
- Describe, never recommend. No buy/sell/hold calls, no price targets, no "should buy" language.
- Be specific and concise. No filler openers, no restating the prompt.
- Flag what the data cannot tell you, and what a reader would need to watch next.

Format (light markdown, no headings deeper than two):
**Tape** — two sentences on where the price sits in its 52-week range and how today moved.
**Flow** — one or two sentences on volume against the 30-day average and the one-year / year-to-date trend.
**Headlines** — two or three bullets naming what the coverage on file actually says, each with its publisher. If there are no headlines, say so in one line.
**Watch** — two or three bullets on what would confirm or break the read.

Keep the whole note under 220 words.`;

type Detail = {
  company: { symbol: string; name: string; sector: string };
  quote: {
    price: number | null;
    previousClose: number | null;
    change: number | null;
    changePercent: number | null;
    dayHigh: number | null;
    dayLow: number | null;
    volume: number | null;
    updatedAt: number;
  } | null;
  fundamentals: {
    officialName: string | null;
    industry: string | null;
    fiftyTwoWeekHigh: number | null;
    fiftyTwoWeekLow: number | null;
    oneYearChangePercent: number | null;
    ytdChangePercent: number | null;
    averageVolume30d: number | null;
  } | null;
  news: {
    items: { title: string; source: string; publishedAt?: number }[];
    provider: string | null;
  } | null;
};

const rupees = (value: number | null | undefined) =>
  typeof value === "number" ? `₹${value.toFixed(2)}` : "not on file";

const percent = (value: number | null | undefined) =>
  typeof value === "number" ? `${value >= 0 ? "+" : ""}${value.toFixed(2)}%` : "not on file";

const count = (value: number | null | undefined) =>
  typeof value === "number" ? new Intl.NumberFormat("en-IN").format(Math.round(value)) : "not on file";

function hoursAgo(at: number | undefined, now: number): string | null {
  if (!at) return null;
  const hours = Math.round((now - at) / 3_600_000);
  if (hours < 1) return "under an hour ago";
  if (hours < 48) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

/** Flattens one company's cached data into the fact sheet sent to the model. */
function factSheet(detail: Detail, now: number): string {
  const { company, quote, fundamentals, news } = detail;
  const lines: string[] = [
    `Company: ${fundamentals?.officialName ?? company.name} (NSE: ${company.symbol})`,
    `Desk classification: ${company.sector}`,
    fundamentals?.industry ? `Exchange industry feed: ${fundamentals.industry}` : null,
    "",
    `Last traded: ${rupees(quote?.price)}`,
    `Previous close: ${rupees(quote?.previousClose)}`,
    `Day change: ${quote?.change === null || quote?.change === undefined ? "not on file" : `${quote.change >= 0 ? "+" : ""}${quote.change.toFixed(2)} (${percent(quote?.changePercent)})`}`,
    `Day range: ${rupees(quote?.dayLow)} - ${rupees(quote?.dayHigh)}`,
    `Volume today: ${count(quote?.volume)} shares`,
    `30-day average volume: ${count(fundamentals?.averageVolume30d)} shares`,
    `52-week range: ${rupees(fundamentals?.fiftyTwoWeekLow)} - ${rupees(fundamentals?.fiftyTwoWeekHigh)}`,
    `One-year return: ${percent(fundamentals?.oneYearChangePercent)}`,
    `Year-to-date return: ${percent(fundamentals?.ytdChangePercent)}`,
    quote ? `Price as read: ${new Date(quote.updatedAt).toISOString()}` : null,
    "",
    "Headlines on file:",
  ].filter((line): line is string => line !== null);

  const items = (news?.items ?? []).slice(0, MAX_HEADLINES);
  if (items.length === 0) {
    lines.push("(none — the news feed returned nothing for this company)");
  } else {
    for (const item of items) {
      const when = hoursAgo(item.publishedAt, now);
      lines.push(`- "${item.title}" - ${item.source}${when ? ` (${when})` : ""}`);
    }
  }

  return lines.join("\n");
}

function readError(body: string): string {
  try {
    const parsed = JSON.parse(body) as { error?: { message?: string } };
    if (parsed.error?.message) return parsed.error.message.slice(0, 200);
  } catch {
    // Not JSON — fall through to the raw text.
  }
  return body.replace(/\s+/g, " ").trim().slice(0, 200) || "Unknown error";
}

type GenerateResponse = {
  candidates?: {
    content?: { parts?: { text?: string }[] };
    finishReason?: string;
  }[];
  promptFeedback?: { blockReason?: string };
  error?: { message?: string };
};

async function writeWithGemini(apiKey: string, facts: string): Promise<{ body: string; model: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${ENDPOINT}/${MODEL}:generateContent`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts: [{ text: facts }] }],
        generationConfig: { maxOutputTokens: MAX_OUTPUT_TOKENS },
      }),
    });

    const payload = (await response.json()) as GenerateResponse;

    if (!response.ok) {
      throw new Error(payload.error?.message?.slice(0, 200) ?? `HTTP ${response.status}`);
    }

    const candidate = payload.candidates?.[0];
    const body = (candidate?.content?.parts ?? [])
      .map((part) => part.text?.trim() ?? "")
      .filter(Boolean)
      .join("\n\n");

    if (!body) {
      if (payload.promptFeedback?.blockReason) {
        throw new Error(`Gemini declined the request (${payload.promptFeedback.blockReason}).`);
      }
      if (candidate?.finishReason === "MAX_TOKENS") {
        throw new Error("Gemini ran out of output budget before writing the note.");
      }
      throw new Error("Gemini returned an empty note.");
    }

    return { body: body.slice(0, MAX_BODY_LENGTH), model: MODEL };
  } finally {
    clearTimeout(timer);
  }
}

export const writeNote = action({
  args: { symbol: v.string() },
  handler: async (ctx, { symbol }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Sign in to write a desk note.");

    const ticker = symbol.trim().toUpperCase();
    const detail = await ctx.runQuery(api.stock.detail, { symbol: ticker });
    if (!detail) throw new Error(`${ticker} is not on the roster.`);

    const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      const message =
        "Gemini is not configured — add GEMINI_API_KEY (or GOOGLE_API_KEY) in the Keys tab.";
      await ctx.runMutation(internal.stock.upsertBrief, {
        symbol: ticker,
        updatedAt: Date.now(),
        error: message,
      });
      return { ok: false, error: message };
    }

    try {
      const note = await writeWithGemini(apiKey, factSheet(detail, Date.now()));
      await ctx.runMutation(internal.stock.upsertBrief, {
        symbol: ticker,
        body: note.body,
        model: note.model,
        updatedAt: Date.now(),
        error: undefined,
      });
      return { ok: true, model: note.model };
    } catch (error) {
      const message = error instanceof Error ? error.message : "The model call failed.";
      await ctx.runMutation(internal.stock.upsertBrief, {
        symbol: ticker,
        updatedAt: Date.now(),
        error: message,
      });
      return { ok: false, error: message };
    }
  },
});
