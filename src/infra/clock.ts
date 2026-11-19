/** Fonte do "agora" e do "hoje". Entra por parâmetro nas regras que dependem do tempo (R3). */
export type Clock = {
  now(): Date;
  /** Data local de hoje, no formato `AAAA-MM-DD`. */
  today(): string;
};

export function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export const systemClock: Clock = {
  now: () => new Date(),
  today: () => formatLocalDate(new Date()),
};

/** Relógio parado em um dia, para testes. */
export function createFixedClock(today: string): Clock {
  return {
    now: () => new Date(`${today}T12:00:00`),
    today: () => today,
  };
}
