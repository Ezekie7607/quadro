import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  claimIds,
  cleanText,
  cleanTimestamp,
  isRecord,
  isSafeId,
  safeEntries,
} from "./sanitize.ts";

describe("sanitize", () => {
  it("recognizes plain objects only", () => {
    assert.equal(isRecord({}), true);
    assert.equal(isRecord([]), false);
    assert.equal(isRecord(null), false);
    assert.equal(isRecord("x"), false);
  });

  it("drops keys that could reach a prototype", () => {
    const parsed = JSON.parse('{"__proto__": {"polluted": true}, "ok": 1, "constructor": 2}');
    assert.deepEqual(safeEntries(parsed), [["ok", 1]]);
    assert.equal(({} as Record<string, unknown>).polluted, undefined);
  });

  it("accepts ids that are short non-empty strings", () => {
    assert.equal(isSafeId("space-1"), true);
    assert.equal(isSafeId(""), false);
    assert.equal(isSafeId(42), false);
    assert.equal(isSafeId("__proto__"), false);
    assert.equal(isSafeId("x".repeat(201)), false);
  });

  it("caps text and replaces non-strings with an empty string", () => {
    assert.equal(cleanText("abcdef", 3), "abc");
    assert.equal(cleanText(12, 3), "");
  });

  it("keeps finite non-negative timestamps only", () => {
    assert.equal(cleanTimestamp(5, 1), 5);
    assert.equal(cleanTimestamp(-1, 1), 1);
    assert.equal(cleanTimestamp(Number.NaN, 1), 1);
    assert.equal(cleanTimestamp("5", 1), 1);
  });

  it("claims each known id once across lists", () => {
    const known = new Set(["a", "b", "c"]);
    const claimed = new Set<string>();
    assert.deepEqual(claimIds(["a", "a", "x", 3, "b"], known, claimed), ["a", "b"]);
    assert.deepEqual(claimIds(["b", "c"], known, claimed), ["c"]);
    assert.deepEqual(claimIds("not a list", known, claimed), []);
  });
});
