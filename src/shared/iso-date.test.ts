import { describe, expect, it } from "vitest";
import { daysInMonth, monthOf } from "./iso-date";

describe("monthOf", () => {
  it("devolve o ano e o mês do dia", () => {
    expect(monthOf("2026-11-13")).toBe("2026-11");
  });
});

describe("daysInMonth", () => {
  it.each([
    ["2026-11-13", 30],
    ["2026-12-01", 31],
    ["2027-02-10", 28],
    ["2028-02-10", 29],
  ])("o mês de %s tem %s dias", (isoDate, expected) => {
    expect(daysInMonth(isoDate)).toBe(expected);
  });
});
