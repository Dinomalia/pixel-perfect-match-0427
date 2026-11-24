import { addDays, differenceInCalendarDays, format, isValid, parseISO, startOfDay, startOfWeek } from "date-fns";
import type { Task } from "@/lib/tasks";

export const dateKey = (date: Date) => format(date, "yyyy-MM-dd");
export const weekStart = (date: Date) => startOfWeek(date, { weekStartsOn: 1 });

export function activeDeliveries(tasks: Task[]) {
  return tasks.filter((task) => !task.deletedAt && task.status !== "Aprovado" && isValid(parseISO(task.dueDate)))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.title.localeCompare(b.title));
}

export function deliveriesBetween(tasks: Task[], start: Date, days: number) {
  const from = dateKey(start);
  const to = dateKey(addDays(start, days));
  return activeDeliveries(tasks).filter((task) => task.dueDate >= from && task.dueDate < to);
}

export function personalDeliveries(tasks: Task[], personId: string, today: Date, days = 30) {
  return deliveriesBetween(tasks, startOfDay(today), days).filter((task) => task.assignees.includes(personId));
}

export function deliveryAlert(task: Task, today: Date) {
  const remaining = differenceInCalendarDays(parseISO(task.dueDate), startOfDay(today));
  return Boolean(task.qualityRework) || (remaining >= 0 && remaining < 7);
}
export const GANTT_DEFAULT_DAYS = 14;
export const STATUS_PROGRESS: Record<string, number> = { "Elaboração": 25, "Verificação": 40, Qualidade: 60, Retrabalho: 45, "Em Aprovação": 85, Aprovado: 100 };

export function ganttStart(task: Task) {
  return addDays(parseISO(task.dueDate), -(GANTT_DEFAULT_DAYS - 1));
}

export function taskProgress(task: Task) {
  const list = task.checklist ?? [];
  if (task.status === "Aprovado") return 100;
  if (list.length) return Math.round((list.filter((i) => i.done).length / list.length) * 100);
  return STATUS_PROGRESS[task.status] ?? 0;
}

/** Map taskId -> names of collaborators double-booked on overlapping periods. */
export function allocationConflicts(tasks: Task[], nameOf: (id: string) => string | undefined) {
  const out = new Map<string, Set<string>>();
  const live = tasks.filter((t) => !t.deletedAt && isValid(parseISO(t.dueDate)));
  for (let i = 0; i < live.length; i++) for (let j = i + 1; j < live.length; j++) {
    const a = live[i]!, b = live[j]!;
    if (dateKey(ganttStart(a)) > b.dueDate || dateKey(ganttStart(b)) > a.dueDate) continue;
    for (const p of a.assignees.filter((id) => b.assignees.includes(id))) {
      const name = nameOf(p) ?? p;
      for (const t of [a, b]) { if (!out.has(t.id)) out.set(t.id, new Set()); out.get(t.id)!.add(name); }
    }
  }
  return out;
}
