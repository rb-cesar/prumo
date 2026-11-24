/** Valor em dinheiro, em centavos inteiros: como ler o que a pessoa digitou e como mostrar. Imutável. */
export class Money {
  private readonly amountInCents: number;

  private constructor(amountInCents: number) {
    this.amountInCents = amountInCents;
  }

  static ofCents(amountInCents: number): Money {
    return new Money(amountInCents);
  }

  /** Lê "45,90", "1.200" ou "120.5". Devolve `null` se não for um valor; zero vale, negativo não. */
  static parse(text: string): Money | null {
    const cleaned = text.trim().replace(/[^\d,.]/g, "");
    if (cleaned === "") return null;
    const usesThousandsDots = /^\d{1,3}(\.\d{3})+$/.test(cleaned);
    const hasDecimalComma = cleaned.includes(",");
    let normalized = cleaned;
    if (hasDecimalComma) normalized = cleaned.replace(/\./g, "").replace(",", ".");
    else if (usesThousandsDots) normalized = cleaned.replace(/\./g, "");
    const value = Number(normalized);
    if (!Number.isFinite(value) || value < 0) return null;
    return new Money(Math.round(value * 100));
  }

  get cents(): number {
    return this.amountInCents;
  }

  /** "R$ 1.234,56", ou "−R$ 12,00" se negativo. */
  format(): string {
    const reais = Math.floor(Math.abs(this.amountInCents) / 100);
    const cents = String(Math.abs(this.amountInCents) % 100).padStart(2, "0");
    return `${this.signText()}R$ ${reais.toLocaleString("pt-BR")},${cents}`;
  }

  /** "R$ 1.234", em reais inteiros (arredonda), para os resumos e as barras da tela. */
  formatWhole(): string {
    const reais = Math.round(Math.abs(this.amountInCents) / 100);
    return `${this.signText()}R$ ${reais.toLocaleString("pt-BR")}`;
  }

  private signText(): string {
    return this.amountInCents < 0 ? "−" : "";
  }
}
