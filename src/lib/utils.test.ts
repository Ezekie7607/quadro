import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseEuro } from "./utils.ts";

describe("parseEuro", () => {
  it("reads plain whole euros", () => {
    assert.equal(parseEuro("4200"), 4200);
    assert.equal(parseEuro("0"), 0);
  });

  it("treats a dot before three digits as a thousands separator", () => {
    assert.equal(parseEuro("4.200"), 4200);
    assert.equal(parseEuro("1.234.567"), 1234567);
  });

  it("treats the comma as the decimal separator and rounds cents", () => {
    assert.equal(parseEuro("1500,49"), 1500);
    assert.equal(parseEuro("1500,50"), 1501);
    assert.equal(parseEuro("4.200,50"), 4201);
  });

  it("reads a dot that is not a thousands group as a decimal point", () => {
    assert.equal(parseEuro("4200.50"), 4201);
    assert.equal(parseEuro("12.5"), 13);
  });

  it("ignores currency signs and spaces", () => {
    assert.equal(parseEuro("€ 1 500"), 1500);
    assert.equal(parseEuro("2.500 €"), 2500);
  });

  it("never returns a negative, NaN or empty value", () => {
    assert.equal(parseEuro(""), 0);
    assert.equal(parseEuro("abc"), 0);
    assert.equal(parseEuro("-500"), 500);
    assert.equal(parseEuro(",,,"), 0);
  });
});
