/** Revisão do ciclo (doc/business-rules/history.md, BR-H06). Regra pura: sem tela, banco ou relógio. */

import { isValidIsoDate } from "../../iso-date";
import { Cycle } from "./cycle";
import { TaskRuleViolation } from "./task-rule-violation";

/** O que fica gravado numa resposta que a pessoa deixou em branco. */
const BLANK_ANSWER = "—";

/** O estado completo de uma revisão, sem comportamento: o que a camada de dados grava e lê. */
export type CycleReviewRecord = {
  /** O domingo que começa o ciclo revisado. */
  cycleStart: string;
  worked: string;
  hindered: string;
  changeNext: string;
  /** O dia em que a revisão foi salva. */
  savedOn: string;
};

export type NewCycleReviewInput = {
  cycleStart: string;
  worked: string;
  hindered: string;
  changeNext: string;
  savedOn: string;
};

function validatedSnapshot(snapshot: CycleReviewRecord): CycleReviewRecord {
  Cycle.startingOn(snapshot.cycleStart);
  if (!isValidIsoDate(snapshot.savedOn)) throw new TaskRuleViolation("invalid-date");
  return Object.freeze({ ...snapshot });
}

/** Revisão imutável: depois de salva não se edita. */
export class CycleReview {
  private readonly snapshot: CycleReviewRecord;

  private constructor(snapshot: CycleReviewRecord) {
    this.snapshot = validatedSnapshot(snapshot);
  }

  /** Revisão nova: pelo menos uma resposta; as em branco viram "—". */
  static create(input: NewCycleReviewInput): CycleReview {
    const answers = [input.worked, input.hindered, input.changeNext].map((answer) => answer.trim());
    if (answers.every((answer) => answer === "")) {
      throw new TaskRuleViolation("review-needs-an-answer");
    }
    const [worked, hindered, changeNext] = answers.map((answer) => answer || BLANK_ANSWER);
    return new CycleReview({
      cycleStart: input.cycleStart,
      worked: worked ?? BLANK_ANSWER,
      hindered: hindered ?? BLANK_ANSWER,
      changeNext: changeNext ?? BLANK_ANSWER,
      savedOn: input.savedOn,
    });
  }

  /** Para a camada de dados reconstruir uma revisão gravada. */
  static fromRecord(snapshot: CycleReviewRecord): CycleReview {
    return new CycleReview(snapshot);
  }

  toRecord(): CycleReviewRecord {
    return { ...this.snapshot };
  }

  get cycle(): Cycle {
    return Cycle.startingOn(this.snapshot.cycleStart);
  }
  get worked(): string {
    return this.snapshot.worked;
  }
  get hindered(): string {
    return this.snapshot.hindered;
  }
  get changeNext(): string {
    return this.snapshot.changeNext;
  }
  get savedOn(): string {
    return this.snapshot.savedOn;
  }
}
