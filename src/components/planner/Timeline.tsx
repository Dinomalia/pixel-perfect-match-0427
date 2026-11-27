import { useEffect, useState } from "react";
import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertTriangle, CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { initials, fmtDate, STATUS_STYLE, STATUSES, useTasks, type Task } from "@/lib/tasks";
import { allocationConflicts, dateKey, deliveryAlert, ganttStart, personalDeliveries, taskProgress, weekStart } from "@/lib/timeline";
import { StatusBadge } from "./Shared";
import { TaskViewDialog } from "./TaskViewDialog";

function useToday() {
  const [today, setToday] = useState<Date | null>(null);
  useEffect(() => {
    const refresh = () => setToday(new Date());
    refresh();
    const timer = window.setInterval(refresh, 60_000);
    return () => window.clearInterval(timer);
  }, []);
  return today;
}

export function TimelineView({ onEdit }: { onEdit: (task: Task) => void }) {
  const { filtered, people, projects, companyOf } = useTasks();
  const today = useToday();
  const [offset, setOffset] = useState(0);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [detail, setDetail] = useState<Task | null>(null);
  if (!today) return <p className="py-8 text-sm text-muted-foreground">Carregando cronograma…</p>;
  const days = 42, dayWidth = 28, rowH = 44;
  const start = addDays(weekStart(today), offset - 7);
  const dates = Array.from({ length: days }, (_, i) => addDays(start, i));
  const live = filtered.filter((t) => !t.deletedAt);
  const nameOf = (id: string) => people.find((p) => p.id === id)?.name;
  const conflicts = allocationConflicts(live, nameOf);
  const groups = [...new Set(live.map((t) => t.projectCode))].sort().map((code) => ({ code, tasks: live.filter((t) => t.projectCode === code).sort((x, y) => x.dueDate.localeCompare(y.dueDate)) }));
  const docCode = (t: Task, list: Task[]) => `${t.projectCode}-${t.docType}-${String(list.filter((x) => x.docType === t.docType).indexOf(t) + 1).padStart(3, "0")}`;
  const barColor: Record<string, string> = { "Elaboração": "bg-status-draft", "Verificação": "bg-status-verify", Qualidade: "bg-status-quality", Retrabalho: "bg-status-rework", "Em Aprovação": "bg-status-pending", Aprovado: "bg-status-approved", Hold: "bg-status-hold" };
  return <section className="space-y-4" aria-label="Cronograma Gantt">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-xl font-bold">Cronograma</h2><p className="text-sm text-muted-foreground">{format(start, "dd MMM", { locale: ptBR })} — {format(addDays(start, days - 1), "dd MMM yyyy", { locale: ptBR })} · {live.length} documentos · {conflicts.size} com conflito</p></div>
      <div className="flex items-center gap-2">
        <Button size="icon" variant="outline" aria-label="Período anterior" onClick={() => setOffset((v) => v - 14)}><ChevronLeft /></Button>
        <Button variant="outline" onClick={() => setOffset(0)}>Hoje</Button>
        <Button size="icon" variant="outline" aria-label="Próximo período" onClick={() => setOffset((v) => v + 14)}><ChevronRight /></Button>
      </div>
    </div>
    <div className="kanban-scroll max-h-[70vh] overflow-auto border border-border bg-card" role="region" aria-label="Gantt de documentos" tabIndex={0}>
      <div style={{ minWidth: 380 + days * dayWidth }}>
        <div className="sticky top-0 z-30 flex border-b border-border bg-card">
          <div className="sticky left-0 z-40 flex w-[380px] shrink-0 border-r border-border bg-card p-2 text-xs font-semibold uppercase text-muted-foreground"><span className="flex-1">Projeto / Documento</span><span className="w-12 text-right">%</span></div>
          {dates.map((d) => <div key={dateKey(d)} style={{ width: dayWidth }} className={cn("shrink-0 border-r border-border py-1 text-center text-[10px]", dateKey(d) === dateKey(today) ? "bg-accent font-bold text-primary" : "text-muted-foreground")}><p className="capitalize">{format(d, "EEEEE", { locale: ptBR })}</p><p>{format(d, "dd")}</p></div>)}
        </div>
        {groups.map((g) => {
          const open = !collapsed[g.code];
          const proj = projects.find((p) => p.code === g.code);
          return <div key={g.code}>
            <div className="flex border-b border-border bg-muted/50">
              <button type="button" aria-expanded={open} onClick={() => setCollapsed((c) => ({ ...c, [g.code]: open }))} className="sticky left-0 z-20 flex w-[380px] shrink-0 items-center gap-1 border-r border-border bg-muted p-2 text-left text-sm font-bold">
                {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}{companyOf(g.code)?.name} • {g.code}<span className="ml-1 truncate font-normal text-muted-foreground">{proj?.name}</span><span className="ml-auto text-xs font-normal text-muted-foreground">{g.tasks.length}</span>
              </button>
              <div className="flex-1" />
            </div>
            {open && g.tasks.map((t) => {
              const pct = taskProgress(t);
              const s = differenceInCalendarDays(ganttStart(t), start);
              const e = differenceInCalendarDays(parseISO(t.dueDate), start) + 1;
              const left = Math.max(0, s), right = Math.min(days, e);
              const clash = conflicts.get(t.id);
              const clashText = clash ? `Conflito de alocação: ${[...clash].join(", ")}` : "";
              const owner = t.assignees[0] ? nameOf(t.assignees[0]) : undefined;
              return <div key={t.id} className="flex border-b border-border" style={{ height: rowH }}>
                <button type="button" onClick={() => setDetail(t)} className="sticky left-0 z-20 flex w-[380px] shrink-0 items-center gap-2 border-r border-border bg-card py-1 pl-8 pr-2 text-left hover:bg-accent">
                  <div className="min-w-0 flex-1"><p className="truncate text-[11px] font-semibold text-muted-foreground">[{t.docType}] {docCode(t, g.tasks)}</p><p className="truncate text-xs">{t.title}</p></div>
                  {owner && <span title={owner} className="grid size-6 shrink-0 place-items-center rounded-full bg-primary/10 text-[9px] font-bold text-primary">{initials(owner)}</span>}
                  <span className="w-10 text-right text-xs font-semibold">{pct}%</span>
                </button>
                <div className="relative flex-1">
                  <div className="pointer-events-none absolute inset-0 flex">{dates.map((d) => <div key={dateKey(d)} style={{ width: dayWidth }} className={cn("h-full shrink-0 border-r border-border/50", dateKey(d) === dateKey(today) && "bg-accent/60")} />)}</div>
                  {right > left && <button type="button" onClick={() => setDetail(t)} title={clashText || `${t.title} · ${pct}%`} aria-label={`${t.title} ${pct}%${clash ? ". " + clashText : ""}`}
                    className={cn("absolute top-2 h-7 overflow-hidden rounded text-left text-[11px] font-semibold text-foreground", barColor[t.status], clash && "ring-2 ring-destructive")}
                    style={{ left: left * dayWidth + 2, width: (right - left) * dayWidth - 4 }}>
                    <span className="absolute inset-y-0 left-0 bg-foreground/25" style={{ width: `${pct}%` }} />
                    <span className="relative flex h-full items-center gap-1 truncate px-2">{clash && <AlertTriangle className="size-3.5 shrink-0 text-destructive" />}{t.title} · {pct}%</span>
                  </button>}
                  {clash && right > left && <span className="pointer-events-none absolute -bottom-0.5 text-[9px] font-medium text-destructive" style={{ left: left * dayWidth + 4 }}>⚠️ {clashText}</span>}
                </div>
              </div>;
            })}
          </div>;
        })}
      </div>
    </div>
    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">{STATUSES.map((st) => <span key={st} className="inline-flex items-center gap-1.5"><span className={cn("size-2 rounded-full", STATUS_STYLE[st].dot)} />{st}</span>)}<span className="inline-flex items-center gap-1 text-destructive"><AlertTriangle className="size-3" />Conflito de alocação</span><span>· Barras: 14 dias até o prazo de entrega</span></div>
    {live.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">Nenhum documento para os filtros selecionados.</p>}
    <TaskViewDialog task={detail} onClose={() => setDetail(null)} onEdit={onEdit} />
  </section>;
}

export function PersonalTimeline({ me, onEdit }: { me: string; onEdit: (task: Task) => void }) {
  const { tasks } = useTasks();
  const today = useToday();
  const [detail, setDetail] = useState<Task | null>(null);
  const deliveries = today ? personalDeliveries(tasks, me, today) : [];
  const weeks = [...new Set(deliveries.map((task) => dateKey(weekStart(parseISO(task.dueDate)))))];
  return <section aria-label="Meu Cronograma de Entregas">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground"><CalendarDays className="size-4" />Meu Cronograma de Entregas</h3><span className="text-xs text-muted-foreground">Próximos 30 dias · {deliveries.length} entregas</span></div>
    {weeks.map((week) => <div key={week} className="mb-4">
      <p className="mb-2 text-xs font-semibold text-muted-foreground">Semana de {format(parseISO(week), "dd MMM", { locale: ptBR })}</p>
      <div className="ml-2 space-y-2 border-l-2 border-border pl-4">{deliveries.filter((task) => dateKey(weekStart(parseISO(task.dueDate))) === week).map((task) => {
        const alert = today ? deliveryAlert(task, today) : false;
        return <div key={task.id} className={cn("relative flex flex-wrap items-center gap-3 border-b border-border py-3", alert && "border-status-rework/40")}>
          <span className={cn("absolute -left-[23px] top-5 size-3 rounded-full border-2 border-background", alert ? "bg-status-rework" : STATUS_STYLE[task.status].dot)} />
          <div className={cn("w-14 shrink-0 text-sm font-bold", alert ? "text-status-rework" : "text-foreground")}>{fmtDate(task.dueDate).slice(0, 5)}<p className="text-[10px] font-normal capitalize text-muted-foreground">{format(parseISO(task.dueDate), "EEE", { locale: ptBR })}</p></div>
          <div className="min-w-0 flex-1 basis-48"><p className="break-words text-sm font-semibold">{task.title}</p><p className="text-xs text-muted-foreground">{task.projectCode} · [{task.docType}]</p>
            {alert && <p className="mt-1 flex items-center gap-1 text-xs font-medium text-status-rework"><AlertTriangle className="size-3" />{task.qualityRework ? "Retrabalho Qualidade" : task.dueDate === dateKey(today ?? new Date()) ? "Entrega hoje" : "Vence em menos de 7 dias"}</p>}
          </div>
          <StatusBadge status={task.status} /><Button size="sm" variant="outline" onClick={() => setDetail(task)}>Ver detalhes<ChevronRight /></Button>
        </div>;
      })}</div>
    </div>)}
    {today && deliveries.length === 0 && <p className="border-y border-border py-6 text-center text-sm text-muted-foreground">Nenhuma entrega atribuída a você nos próximos 30 dias.</p>}
    <TaskViewDialog task={detail} onClose={() => setDetail(null)} onEdit={onEdit} />
  </section>;
}