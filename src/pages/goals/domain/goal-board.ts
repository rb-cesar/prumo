import type { Transaction } from "../../../shared/finance/domain/transaction";
import type { Goal } from "../../../shared/goals/domain/goal";
import { GoalProgress } from "../../../shared/goals/domain/goal-progress";
import { RequiredPace } from "./required-pace";

export type GoalHorizon = "short" | "long";

/** Até esta quantidade de dias (3 meses) o prazo é curto; depois disso, longo (BR-M06). */
const LAST_DAY_OF_SHORT_HORIZON = 90;

/** O que a tela desenha de uma meta. */
export type GoalCardView = {
  id: string;
  title: string;
  /** "até qua, 18 nov · faltam 5 dias". */
  dueText: string;
  /** "37%". */
  percentText: string;
  /** De 0 a 1, para a barra. */
  ratio: number;
  isCompleted: boolean;
  /** "R$ 1.800,00 de R$ 5.000,00". */
  savedText: string;
  /** "R$ 70 por semana"; `null` quando a meta já está concluída. */
  paceText: string | null;
};

/** As metas e o que a tela de metas precisa delas: aba, ordem e textos. Imutável. */
export class GoalBoard {
  private readonly progresses: GoalProgress[];
  private readonly today: string;

  constructor(goals: Goal[], transactions: Transaction[], today: string) {
    this.today = today;
    this.progresses = goals.map((goal) => new GoalProgress(goal, transactions));
  }

  /** A aba que abre: a do curto prazo; a do longo só se for a única com metas (BR-M06). */
  get initialHorizon(): GoalHorizon {
    const hasShort = this.progresses.some((progress) => this.horizonOf(progress) === "short");
    const hasLong = this.progresses.some((progress) => this.horizonOf(progress) === "long");
    return !hasShort && hasLong ? "long" : "short";
  }

  /** As metas da aba, com o prazo mais próximo primeiro. */
  toCardViews(horizon: GoalHorizon): GoalCardView[] {
    return this.progresses
      .filter((progress) => this.horizonOf(progress) === horizon)
      .sort((first, second) => first.goal.dueDate.localeCompare(second.goal.dueDate))
      .map((progress) => this.toCardView(progress));
  }

  private horizonOf(progress: GoalProgress): GoalHorizon {
    return progress.daysLeft(this.today) <= LAST_DAY_OF_SHORT_HORIZON ? "short" : "long";
  }

  private toCardView(progress: GoalProgress): GoalCardView {
    const pace = new RequiredPace(progress.remainingInCents, progress.daysLeft(this.today));
    return {
      id: progress.goal.id,
      title: progress.goal.title,
      dueText: progress.dueText(this.today),
      percentText: progress.percentText,
      ratio: progress.ratio,
      isCompleted: progress.isCompleted,
      savedText: progress.savedText,
      paceText: pace.toText(),
    };
  }
}
