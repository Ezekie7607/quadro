import { addDaysIso } from "./dates.ts";

/** One column of the due chart: a calendar day and what falls due on it. */
export type DueDay<T> = { iso: string; items: T[] };

/**
 * Items laid out day by day from today to the horizon, both included, like
 * the home stack. Anything dated before today lands in `overdue` instead of a
 * column; anything past the horizon is left out.
 */
export function dueDays<T extends { dueDate: string }>(
  items: readonly T[],
  today: string,
  horizonDays: number,
): { overdue: T[]; days: DueDay<T>[] } {
  const days: DueDay<T>[] = Array.from({ length: Math.max(0, horizonDays) + 1 }, (_, index) => ({
    iso: addDaysIso(index, today),
    items: [],
  }));
  const byIso = new Map(days.map((day) => [day.iso, day]));
  const overdue: T[] = [];
  for (const item of items) {
    if (item.dueDate < today) overdue.push(item);
    else byIso.get(item.dueDate)?.items.push(item);
  }
  return { overdue, days };
}

export type ClientRow = {
  key: string;
  label: string;
  won: number;
  open: number;
  deals: number;
  /** How many clients this row folds together; 1 for a single client. */
  clients: number;
};

export const NO_CLIENT_LABEL = "Senza cliente";
const OTHERS_KEY = "\u0000others";

/**
 * Euro per client, won and still open, biggest first. Names match regardless
 * of case and stray spaces, and deals without a client share one row. Past
 * `limit` rows the smallest fold into a single "Altri" row, so the chart keeps
 * a fixed height however many clients there are.
 */
export function clientTotals(
  deals: readonly { client: string; value: number; won: boolean }[],
  limit = 5,
): ClientRow[] {
  const rows = new Map<string, ClientRow>();
  for (const deal of deals) {
    const name = deal.client.trim().replace(/\s+/g, " ");
    const key = name.toLocaleLowerCase("it-IT");
    const value = Number.isFinite(deal.value) && deal.value > 0 ? deal.value : 0;
    const row = rows.get(key) ?? {
      key,
      label: name || NO_CLIENT_LABEL,
      won: 0,
      open: 0,
      deals: 0,
      clients: 1,
    };
    rows.set(key, {
      ...row,
      won: row.won + (deal.won ? value : 0),
      open: row.open + (deal.won ? 0 : value),
      deals: row.deals + 1,
    });
  }

  const sorted = [...rows.values()].sort(
    (a, b) => b.won + b.open - (a.won + a.open) || a.label.localeCompare(b.label, "it"),
  );
  const cap = Math.max(1, limit);
  if (sorted.length <= cap) return sorted;

  const kept = sorted.slice(0, cap - 1);
  const rest = sorted.slice(cap - 1);
  const others = rest.reduce<ClientRow>(
    (sum, row) => ({
      ...sum,
      won: sum.won + row.won,
      open: sum.open + row.open,
      deals: sum.deals + row.deals,
    }),
    {
      key: OTHERS_KEY,
      label: `Altri ${rest.length} clienti`,
      won: 0,
      open: 0,
      deals: 0,
      clients: rest.length,
    },
  );
  return [...kept, others];
}
