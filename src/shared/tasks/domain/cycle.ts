import { addDays, isValidIsoDate, parseIsoDate } from "../../iso-date";
import { TaskRuleViolation } from "./task-rule-violation";

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

/** Uma semana de domingo a sábado, identificada só pelas datas. */
export class Cycle {
  readonly start: string;

  private constructor(start: string) {
    this.start = start;
  }

  /** O ciclo que contém o dia dado. */
  static containing(isoDate: string): Cycle {
    const weekday = parseIsoDate(isoDate).getUTCDay();
    return new Cycle(addDays(isoDate, -weekday));
  }

  /** O ciclo que começa no domingo dado; recusa qualquer outro dia. */
  static startingOn(isoDate: string): Cycle {
    if (!isValidIsoDate(isoDate)) throw new TaskRuleViolation("invalid-date");
    if (parseIsoDate(isoDate).getUTCDay() !== 0) {
      throw new TaskRuleViolation("cycle-must-start-on-sunday");
    }
    return new Cycle(isoDate);
  }

  get end(): string {
    return addDays(this.start, 6);
  }

  /** Por exemplo, "8 a 14 nov" ou "29 nov a 5 dez". */
  get label(): string {
    const startDate = parseIsoDate(this.start);
    const endDate = parseIsoDate(this.end);
    const startMonth = MONTH_NAMES_SHORT[startDate.getUTCMonth()];
    const endMonth = MONTH_NAMES_SHORT[endDate.getUTCMonth()];
    const sameMonth = startDate.getUTCMonth() === endDate.getUTCMonth();
    return sameMonth
      ? `${startDate.getUTCDate()} a ${endDate.getUTCDate()} ${endMonth}`
      : `${startDate.getUTCDate()} ${startMonth} a ${endDate.getUTCDate()} ${endMonth}`;
  }

  includes(isoDate: string): boolean {
    return isoDate >= this.start && isoDate <= this.end;
  }

  isBefore(other: Cycle): boolean {
    return this.start < other.start;
  }

  equals(other: Cycle): boolean {
    return this.start === other.start;
  }
}
