import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { NO_CLIENT_LABEL, clientTotals, dueDays } from "./chart-data.ts";

describe("dueDays", () => {
  const today = "2026-09-29";

  it("has one column per day, today and the horizon included", () => {
    const { days } = dueDays([], today, 7);
    assert.equal(days.length, 8);
    assert.equal(days[0].iso, "2026-09-29");
    assert.equal(days[7].iso, "2026-10-06");
  });

  it("puts past dates in overdue and drops dates past the horizon", () => {
    const items = [
      { id: "a", dueDate: "2026-09-17" },
      { id: "b", dueDate: "2026-09-29" },
      { id: "c", dueDate: "2026-10-03" },
      { id: "d", dueDate: "2026-10-03" },
      { id: "e", dueDate: "2026-10-07" },
    ];
    const { overdue, days } = dueDays(items, today, 7);
    assert.deepEqual(
      overdue.map((item) => item.id),
      ["a"],
    );
    assert.deepEqual(
      days[0].items.map((item) => item.id),
      ["b"],
    );
    assert.deepEqual(
      days[4].items.map((item) => item.id),
      ["c", "d"],
    );
    assert.equal(
      days.reduce((sum, day) => sum + day.items.length, 0),
      3,
    );
  });

  it("crosses the October clock change without skipping a day", () => {
    const { days } = dueDays([], "2026-10-20", 14);
    assert.equal(days.length, 15);
    assert.deepEqual(
      days.slice(4, 7).map((day) => day.iso),
      ["2026-10-24", "2026-10-25", "2026-10-26"],
    );
  });
});

describe("clientTotals", () => {
  it("sums won and open euro per client, biggest first", () => {
    const rows = clientTotals([
      { client: "Fiera Lazio", value: 3600, won: false },
      { client: "Logistica Roma Sud", value: 2500, won: true },
      { client: "Cantiere Pomezia", value: 4200, won: false },
      { client: "Logistica Roma Sud", value: 900, won: false },
    ]);
    assert.deepEqual(
      rows.map((row) => [row.label, row.won, row.open, row.deals]),
      [
        ["Cantiere Pomezia", 0, 4200, 1],
        ["Fiera Lazio", 0, 3600, 1],
        ["Logistica Roma Sud", 2500, 900, 2],
      ],
    );
  });

  it("matches names regardless of case and spaces, and groups deals with no client", () => {
    const rows = clientTotals([
      { client: "  garden  village ", value: 1000, won: false },
      { client: "Garden Village", value: 800, won: true },
      { client: "", value: 300, won: false },
      { client: "   ", value: 200, won: false },
    ]);
    assert.equal(rows.length, 2);
    assert.equal(rows[0].label, "garden village");
    assert.equal(rows[0].won + rows[0].open, 1800);
    assert.equal(rows[1].label, NO_CLIENT_LABEL);
    assert.equal(rows[1].deals, 2);
  });

  it("ignores negative or broken values", () => {
    const [row] = clientTotals([
      { client: "A", value: -50, won: true },
      { client: "A", value: Number.NaN, won: false },
    ]);
    assert.equal(row.won + row.open, 0);
    assert.equal(row.deals, 2);
  });

  it("folds the smallest clients into one row past the limit", () => {
    const deals = ["A", "B", "C", "D", "E", "F", "G"].map((client, index) => ({
      client,
      value: (7 - index) * 100,
      won: false,
    }));
    const rows = clientTotals(deals, 5);
    assert.equal(rows.length, 5);
    assert.deepEqual(
      rows.slice(0, 4).map((row) => row.label),
      ["A", "B", "C", "D"],
    );
    assert.equal(rows[4].label, "Altri 3 clienti");
    assert.equal(rows[4].clients, 3);
    assert.equal(rows[4].open, 300 + 200 + 100);
  });
});
