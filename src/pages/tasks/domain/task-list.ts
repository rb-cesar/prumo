import type { Cycle } from "../../../shared/tasks/domain/cycle";
import { sortTasksForList, type Task, type TaskStage } from "../../../shared/tasks/domain/task";
import { TaskDisplay, type TaskRowView } from "./task-display";

export type TaskScope = "cycle" | "backlog";
export type TaskFilter = "all" | "money" | "high";

/**
 * As pendências, com os recortes que a tela faz sobre elas. Imutável: cada recorte devolve outra
 * `TaskList`, então dá para encadear: `list.inCycle(cycle).inStage("todo").matching("money")`.
 */
export class TaskList {
  private readonly tasks: readonly Task[];

  constructor(tasks: readonly Task[]) {
    this.tasks = tasks;
  }

  get count(): number {
    return this.tasks.length;
  }

  // ------------------------------------------------------------ recortes

  inCycle(cycle: Cycle): TaskList {
    return this.keeping((task) => task.cycle?.equals(cycle) === true);
  }

  inBacklog(): TaskList {
    return this.keeping((task) => task.isInBacklog);
  }

  inStage(stage: TaskStage): TaskList {
    return this.keeping((task) => task.stage === stage);
  }

  matching(filter: TaskFilter): TaskList {
    if (filter === "money") return this.keeping((task) => task.money !== null);
    if (filter === "high") return this.keeping((task) => task.priority === "high");
    return this;
  }

  /** BR-T05: a ordem em que a lista aparece. */
  inListOrder(): TaskList {
    return new TaskList(sortTasksForList(this.tasks));
  }

  // ------------------------------------------------------------ o que a tela mostra

  toRowViews(today: string): TaskRowView[] {
    return this.tasks.map((task) => new TaskDisplay(task).toRowView(today));
  }

  // ------------------------------------------------------------ por dentro

  private keeping(shouldKeep: (task: Task) => boolean): TaskList {
    return new TaskList(this.tasks.filter(shouldKeep));
  }
}
