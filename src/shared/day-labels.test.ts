import { describe, expect, it } from "vitest";
import { describeDay, describeMonth, monthName } from "./day-labels";

const today = "2026-11-13";

describe("describeDay", () => {
  it("usa Hoje, Ontem e Amanhã para os dias vizinhos", () => {
    expect([
      describeDay("2026-11-13", today),
      describeDay("2026-11-12", today),
      describeDay("2026-11-14", today),
    ]).toEqual(["Hoje", "Ontem", "Amanhã"]);
  });

  it("escreve os outros dias com o dia da semana", () => {
    expect(describeDay("2026-11-18", today)).toBe("qua, 18 nov");
  });
});

describe("meses", () => {
  it("dá o nome do mês sozinho", () => {
    expect(monthName("2026-11-13")).toBe("novembro");
  });

  it("descreve o mês e o ano, com a inicial maiúscula", () => {
    expect(describeMonth("2026-03-01")).toBe("Março de 2026");
  });
});
