import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { type TasksData, tasksKeys } from "../../data/tasks";
import type { TransactionsData } from "../../data/transactions";
import type { Clock } from "../../infra/clock";
import type { IdGenerator } from "../../shared/ids";
import { Cycle } from "../../shared/tasks/domain/cycle";
import {
  type MoneyDirection,
  Task,
  type TaskPriority,
  type TaskStage,
} from "../../shared/tasks/domain/task";
import {
  TaskRuleViolation,
  type TaskRuleViolationReason,
} from "../../shared/tasks/domain/task-rule-violation";
import { useCompleteTask } from "../../shared/tasks/use-complete-task";
import { Money, type TaskFilter, TaskList, type TaskRowView, type TaskScope } from "./domain";

export type TasksModelDeps = {
  tasks: TasksData;
  transactions: TransactionsData;
  clock: Clock;
  generateId: IdGenerator;
};

export type TasksScreenState =
  | { status: "loading" }
  | { status: "error"; reason: "data-unavailable" }
  | {
      status: "ready";
      cycleLabel: string;
      scope: TaskScope;
      stage: TaskStage;
      filter: TaskFilter;
      counts: { cycle: number; backlog: number; todo: number; doing: number; done: number };
      rows: TaskRowView[];
    };

/** O que a pessoa preenche ao adicionar uma pendência. */
export type NewTaskForm = {
  title: string;
  dueDate: string;
  priority: TaskPriority;
  placement: TaskScope;
  amountText: string;
  direction: MoneyDirection;
};

export type CreateTaskResult =
  | { ok: true }
  | { ok: false; reason: TaskRuleViolationReason | "amount-not-a-number" };

/** BR-T08: lê as pendências e devolve ao backlog, gravando, as que sobraram de um ciclo que acabou. */
async function loadSettledTasks(tasksData: TasksData, currentCycle: Cycle): Promise<Task[]> {
  const stored = await tasksData.list();
  const settled = stored.map((task) => task.settledFor(currentCycle));
  const changed = settled.filter((task, index) => task !== stored[index]);
  await Promise.all(changed.map((task) => tasksData.save(task)));
  return settled;
}

export function useTasksModel({
  tasks: tasksData,
  transactions: transactionsData,
  clock,
  generateId,
}: TasksModelDeps) {
  const queryClient = useQueryClient();
  const completeTask = useCompleteTask({
    tasks: tasksData,
    transactions: transactionsData,
    clock,
    generateId,
  });
  const [scope, setScope] = useState<TaskScope>("cycle");
  const [stage, setStage] = useState<TaskStage>("todo");
  const [filter, setFilter] = useState<TaskFilter>("all");

  const today = clock.today();
  const currentCycle = Cycle.containing(today);

  const tasksQuery = useQuery({
    queryKey: tasksKeys.all,
    queryFn: () => loadSettledTasks(tasksData, Cycle.containing(clock.today())),
  });

  const saveTask = useMutation({
    mutationFn: (task: Task) => tasksData.save(task),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: tasksKeys.all }),
  });
  const removeTask = useMutation({
    mutationFn: (taskId: string) => tasksData.remove(taskId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: tasksKeys.all }),
  });

  const allTasks = tasksQuery.data ?? [];
  const taskById = (taskId: string): Task | undefined =>
    allTasks.find((task) => task.id === taskId);

  function changeTask(taskId: string, change: (task: Task) => Task): void {
    const task = taskById(taskId);
    if (task !== undefined) saveTask.mutate(change(task));
  }

  function changeStage(taskId: string, wantedStage: (task: Task) => TaskStage): void {
    const task = taskById(taskId);
    if (task !== undefined) void completeTask.changeStage(task, wantedStage(task));
  }

  const state: TasksScreenState = (() => {
    if (tasksQuery.isPending) return { status: "loading" } as const;
    if (tasksQuery.isError) return { status: "error", reason: "data-unavailable" } as const;

    const inCycle = new TaskList(allTasks).inCycle(currentCycle);
    const inBacklog = new TaskList(allTasks).inBacklog();
    const shownTasks = scope === "cycle" ? inCycle.inStage(stage) : inBacklog;

    return {
      status: "ready",
      cycleLabel: currentCycle.label,
      scope,
      stage,
      filter,
      counts: {
        cycle: inCycle.count,
        backlog: inBacklog.count,
        todo: inCycle.inStage("todo").count,
        doing: inCycle.inStage("doing").count,
        done: inCycle.inStage("done").count,
      },
      rows: shownTasks.matching(filter).inListOrder().toRowViews(today),
    } as const;
  })();

  return {
    state,
    today,
    taskById,
    /** A pergunta "lançar no financeiro?" quando se conclui uma pendência com valor. */
    completion: {
      pending: completeTask.pending,
      choose: completeTask.confirm,
      cancel: completeTask.cancel,
    },
    controls: { setScope, setStage, setFilter },
    actions: {
      toggleDone: (taskId: string) =>
        changeStage(taskId, (task) => (task.stage === "done" ? "todo" : "done")),
      moveToStage: (taskId: string, wanted: TaskStage) => changeStage(taskId, () => wanted),
      pullToCycle: (taskId: string) => changeTask(taskId, (task) => task.pullToCycle(currentCycle)),
      moveToBacklog: (taskId: string) => changeTask(taskId, (task) => task.moveToBacklog()),
      remove: (taskId: string) => removeTask.mutate(taskId),
      async create(form: NewTaskForm): Promise<CreateTaskResult> {
        const wantsMoney = form.amountText.trim() !== "";
        const amountInCents = wantsMoney ? (Money.parse(form.amountText)?.cents ?? null) : null;
        if (wantsMoney && amountInCents === null)
          return { ok: false, reason: "amount-not-a-number" };

        try {
          const task = Task.create({
            id: generateId(),
            title: form.title,
            priority: form.priority,
            dueDate: form.dueDate === "" ? null : form.dueDate,
            cycle: form.placement === "cycle" ? currentCycle : null,
            money:
              amountInCents === null
                ? null
                : { amountInCents, direction: form.direction, envelopeId: null },
          });
          await saveTask.mutateAsync(task);
          return { ok: true };
        } catch (error) {
          if (error instanceof TaskRuleViolation) return { ok: false, reason: error.reason };
          throw error;
        }
      },
    },
  };
}
