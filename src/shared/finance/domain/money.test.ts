import { describe, expect, it } from "vitest";
import { Money } from "./money";

describe("Money: mostrar", () => {
  it("formata centavos em reais", () => {
    expect(Money.ofCents(123456).format()).toBe("R$ 1.234,56");
    expect(Money.ofCents(5).format()).toBe("R$ 0,05");
    expect(Money.ofCents(0).format()).toBe("R$ 0,00");
  });

  it("formata valor negativo com sinal na frente", () => {
    expect(Money.ofCents(-1200).format()).toBe("−R$ 12,00");
  });

  it("formata em reais inteiros, arredondando, para os resumos", () => {
    expect(Money.ofCents(620000).formatWhole()).toBe("R$ 6.200");
    expect(Money.ofCents(14160).formatWhole()).toBe("R$ 142");
    expect(Money.ofCents(-1200).formatWhole()).toBe("−R$ 12");
  });
});

describe("Money: ler o que a pessoa digitou", () => {
  it.each([
    ["45,90", 4590],
    ["1.200", 120000],
    ["120.5", 12050],
    ["R$ 3,50", 350],
    ["0", 0],
  ])("lê %s como %s centavos", (text, expected) => {
    expect(Money.parse(text)?.cents).toBe(expected);
  });

  it.each(["", "abc"])("não lê %j como valor", (text) => {
    expect(Money.parse(text)).toBeNull();
  });
});
