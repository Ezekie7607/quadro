import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { addDaysIso, daysFromToday, formatDueRelative, todayIso } from "./dates.ts";

describe("daysFromToday", () => {
  it("counts calendar days both ways", () => {
    assert.equal(daysFromToday("2026-09-27", "2026-09-27"), 0);
    assert.equal(daysFromToday("2026-09-30", "2026-09-27"), 3);
    assert.equal(daysFromToday("2026-09-17", "2026-09-27"), -10);
  });

  it("is not thrown off by the October clock change", () => {
    // Europe/Rome leaves daylight saving time on 2026-10-25.
    assert.equal(daysFromToday("2026-10-26", "2026-10-24"), 2);
    assert.equal(daysFromToday("2026-10-24", "2026-10-26"), -2);
  });
});

describe("formatDueRelative", () => {
  it("names the near days", () => {
    assert.equal(formatDueRelative(todayIso()), "Oggi");
    assert.equal(formatDueRelative(addDaysIso(1)), "Domani");
    assert.equal(formatDueRelative(addDaysIso(-1)), "Ieri");
  });

  it("counts days within a month", () => {
    assert.equal(formatDueRelative(addDaysIso(3)), "Tra 3 g");
    assert.equal(formatDueRelative(addDaysIso(-10)), "10 g fa");
  });

  it("falls back to the short date past a month", () => {
    assert.match(formatDueRelative(addDaysIso(45)), /^\d{1,2} \S+$/);
  });
});
