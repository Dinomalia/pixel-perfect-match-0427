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