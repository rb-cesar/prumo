/** Nomes de dias e meses em português, para telas que falam de datas. Regra pura: "hoje" entra por parâmetro. */
import { daysBetween, parseIsoDate } from "./iso-date";

const WEEKDAY_NAMES_SHORT = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const MONTH_NAMES_SHORT = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
];
const MONTH_NAMES_LONG = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

/** "Hoje", "Ontem", "Amanhã" ou, por exemplo, "qua, 18 nov". */
export function describeDay(isoDate: string, today: string): string {
  const daysFromToday = daysBetween(today, isoDate);
  if (daysFromToday === 0) return "Hoje";
  if (daysFromToday === -1) return "Ontem";
  if (daysFromToday === 1) return "Amanhã";
  const date = parseIsoDate(isoDate);
  return `${WEEKDAY_NAMES_SHORT[date.getUTCDay()]}, ${date.getUTCDate()} ${MONTH_NAMES_SHORT[date.getUTCMonth()]}`;
}

/** "nov": o nome curto do mês, para gráficos e tabelas. */
export function shortMonthName(isoDate: string): string {
  return MONTH_NAMES_SHORT[parseIsoDate(isoDate).getUTCMonth()] ?? "";
}

/** Nome do mês sozinho, como em "Envelopes de novembro". */
export function monthName(isoDate: string): string {
  return MONTH_NAMES_LONG[parseIsoDate(isoDate).getUTCMonth()] ?? "";
}

/** "Novembro de 2026", para subtítulos de tela. */
export function describeMonth(isoDate: string): string {
  const name = monthName(isoDate);
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} de ${parseIsoDate(isoDate).getUTCFullYear()}`;
}
