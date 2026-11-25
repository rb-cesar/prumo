import type { CyclesData } from "../../data/cycles";
import type { TasksData } from "../../data/tasks";
import type { Cycle } from "./domain/cycle";
import type { Task } from "./domain/task";

/**
 * BR-T08 e BR-H08: lê as pendências, anota quantas cada ciclo que acabou tinha e devolve ao
 * backlog, gravando, o que sobrou deles. Idempotente: pode rodar em qualquer tela, quantas
 * vezes for, que o resultado é o mesmo.
 */
export async function loadSettledTasks(
  data: { tasks: TasksData; cycles: CyclesData },
  currentCycle: Cycle,
): Promise<Task[]> {
  const stored = await data.tasks.list();

  const endedCycleStarts = new Set(
    stored
      .map((task) => task.cycle?.start ?? null)
      .filter((start): start is string => start !== null && start < currentCycle.start),
  );
  const closings = [...endedCycleStarts].map((cycleStart) => ({
    cycleStart,
    plannedCount: stored.filter((task) => task.cycle?.start === cycleStart).length,
  }));
  if (closings.length > 0) await data.cycles.recordClosings(closings);

  const settled = stored.map((task) => task.settledFor(currentCycle));
  const changed = settled.filter((task, index) => task !== stored[index]);
  await Promise.all(changed.map((task) => data.tasks.save(task)));
  return settled;
}
