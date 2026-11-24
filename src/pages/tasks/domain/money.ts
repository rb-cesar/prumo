/**
 * Valor de uma pendência, em centavos inteiros: como ler o que a pessoa digitou e como mostrar. Imutável.
 * Cópia de `pages/money/domain/money.ts` com uma regra própria (valor de pendência é maior que zero);
 * sobe para `shared/` na terceira tela que precisar (§6.3).
 */
export class Money {
  private readonly amountInCents: number;

  private constructor(amountInCents: number) {
    this.amountInCents = amountInCents;
  }

  static ofCents(amountInCents: number): Money {
    return new Money(amountInCents);
  }

  /** Lê "45,90", "1.200" ou "120.5". Devolve `null` se não for um valor ou se for zero ou menos. */
  static parse(text: string): Money | null {
    const cleaned = text.trim().replace(/[^\d,.]/g, "");
    if (cleaned === "") return null;
    const usesThousandsDots = /^\d{1,3}(\.\d{3})+$/.test(cleaned);
    const hasDecimalComma = cleaned.includes(",");
    let normalized = cleaned;
    if (hasDecimalComma) normalized = cleaned.replace(/\./g, "").replace(",", ".");
    else if (usesThousandsDots) normalized = cleaned.replace(/\./g, "");
    const value = Number(normalized);
    if (!Number.isFinite(value) || value <= 0) return null;
    return new Money(Math.round(value * 100));
  }

  get cents(): number {
    return this.amountInCents;
  }

  /** "R$ 1.234,56". */
  format(): string {
    const reais = Math.floor(this.amountInCents / 100);
    const cents = String(this.amountInCents % 100).padStart(2, "0");
    return `R$ ${reais.toLocaleString("pt-BR")},${cents}`;
  }
}
