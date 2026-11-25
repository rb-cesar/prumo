import { describe, expect, it } from "vitest";
import { RequiredPace } from "./required-pace";

describe("RequiredPace (BR-M04)", () => {
  it.each([
    [30000, 30, "R$ 70 por semana"],
    [20000, 0, "R$ 200 por semana"],
    [20000, -5, "R$ 200 por semana"],
    [30000, 3, "R$ 300 por semana"],
    [100, 59, "R$ 1 por semana"],
  ])("falta %s centavos e prazo em %s dias: %s", (remaining, days, text) => {
    expect(new RequiredPace(remaining, days).toText()).toBe(text);
  });

  it.each([
    [1200000, 60, "R$ 6.000 por mês"],
    [1000000, 304, "R$ 1.000 por mês"],
    [1200000, 365, "R$ 924 por mês"],
    [500000, 61, "R$ 1.667 por mês"],
  ])("falta %s centavos e prazo em %s dias: %s", (remaining, days, text) => {
    expect(new RequiredPace(remaining, days).toText()).toBe(text);
  });

  it("não mostra ritmo quando não falta nada", () => {
    expect(new RequiredPace(0, 100).toText()).toBeNull();
  });

  it("arredonda para cima em reais inteiros, nunca para menos", () => {
    expect(new RequiredPace(10001, 7).toText()).toBe("R$ 101 por semana");
  });
});
