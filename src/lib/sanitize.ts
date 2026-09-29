// Guards for data that comes from outside the running app: localStorage written
// by an older build, a hand-edited file, an imported backup. Every store
// normalizes through these on rehydrate, and the importer runs the same code
// before it writes anything, so a bad value is repaired or rejected at the
// door instead of crashing a page later.

const BLOCKED_KEYS = new Set(["__proto__", "constructor", "prototype"]);

export const MAX_ID_LENGTH = 200;

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Own entries of a plain object, minus keys that could reach a prototype. */
export function safeEntries(value: unknown): [string, unknown][] {
  if (!isRecord(value)) return [];
  return Object.entries(value).filter(([key]) => !BLOCKED_KEYS.has(key));
}

export function isSafeId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= MAX_ID_LENGTH &&
    !BLOCKED_KEYS.has(value)
  );
}

export function cleanText(value: unknown, max: number): string {
  return typeof value === "string" ? value.slice(0, max) : "";
}

export function cleanTimestamp(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : fallback;
}

/**
 * The ids of `list` that exist in `known` and were not claimed yet, in order.
 * `claimed` is shared across the columns of one board, so a card can sit in
 * one column only.
 */
export function claimIds(list: unknown, known: Set<string>, claimed: Set<string>): string[] {
  if (!Array.isArray(list)) return [];
  const out: string[] = [];
  for (const id of list) {
    if (typeof id !== "string" || !known.has(id) || claimed.has(id)) continue;
    claimed.add(id);
    out.push(id);
  }
  return out;
}
