import { describe, expect, it } from "vitest";
import { Money } from "./money";

describe("Money.format", () => {
  it("formata em real, com vírgula nos centavos e ponto nos milhares", () => {
    expect([
      Money.ofCents(18740).format(),
      Money.ofCents(120050).format(),
      Money.ofCents(5).format(),
    ]).toEqual(["R$ 187,40", "R$ 1.200,50", "R$ 0,05"]);
  });
});

describe("Money.parse", () => {
  it("entende vírgula decimal e ponto de milhar", () => {
    expect([
      Money.parse("45,90")?.cents,
      Money.parse("1.200")?.cents,
      Money.parse("3.000,00")?.cents,
    ]).toEqual([4590, 120000, 300000]);
  });

  it("recusa texto, zero e vazio", () => {
    expect([Money.parse("abc"), Money.parse("0"), Money.parse("  ")]).toEqual([null, null, null]);
  });
});
