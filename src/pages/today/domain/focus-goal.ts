import type { Transaction } from "../../../shared/finance/domain/transaction";
import type { Goal } from "../../../shared/goals/domain/goal";
import { GoalProgress } from "../../../shared/goals/domain/goal-progress";

/** O que o cartão "Meta em foco" mostra. */
export type FocusGoalView =
  | { status: "no-goals" }
  | { status: "all-completed" }
  | {
      status: "in-focus";
      title: string;
      /** "37%". */
      percentText: string;
      /** De 0 a 1, para a barra. */
      ratio: number;
      /** "R$ 1.800,00 de R$ 5.000,00". */
      savedText: string;
      /** "faltam 12 dias". */
      timeLeftText: string;
    };

/** A meta em foco: a não concluída com o prazo mais próximo, mesmo vencida (BR-M08). Imutável. */
export class FocusGoal {
  private readonly progresses: GoalProgress[];
  private readonly today: string;

  constructor(goals: Goal[], transactions: Transaction[], today: string) {
    this.today = today;
    this.progresses = goals.map((goal) => new GoalProgress(goal, transactions));
  }

  toView(): FocusGoalView {
    if (this.progresses.length === 0) return { status: "no-goals" };
    const [nearest] = this.progresses
      .filter((progress) => !progress.isCompleted)
      .sort((first, second) => first.goal.dueDate.localeCompare(second.goal.dueDate));
    if (nearest === undefined) return { status: "all-completed" };
    return {
      status: "in-focus",
      title: nearest.goal.title,
      percentText: nearest.percentText,
      ratio: nearest.ratio,
      savedText: nearest.savedText,
      timeLeftText: nearest.timeLeftText(this.today),
    };
  }
}
