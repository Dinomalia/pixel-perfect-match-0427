import { useEffect, useState } from "react";
import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertTriangle, CalendarDays, ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { initials, fmtDate, STATUS_STYLE, STATUSES, useTasks, type Task } from "@/lib/tasks";
import { dateKey, deliveriesBetween, deliveryAlert, personalDeliveries, weekStart } from "@/lib/timeline";
import { DocTypeBadge, StatusBadge } from "./Shared";
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

function DeliverySummary({ task, onDetails }: { task: Task; onDetails: () => void }) {
  const { companyOf, people } = useTasks();
  return <div className="space-y-3">
    <p className="text-xs text-muted-foreground">{companyOf(task.projectCode)?.name} · {task.projectCode}</p>
    <p className="break-words text-sm font-semibold">{task.title}</p>
    <div className="flex flex-wrap gap-2"><DocTypeBadge type={task.docType} /><StatusBadge status={task.status} /></div>
    <p className="text-xs">Entrega: <b>{fmtDate(task.dueDate)}</b></p>
    <p className="text-xs text-muted-foreground">{task.assignees.map((id) => people.find((p) => p.id === id)?.name).filter(Boolean).join(", ") || "Sem responsável"}</p>
    {Boolean(task.qualityRework) && <p className="flex items-center gap-1 text-xs font-medium text-status-rework"><AlertTriangle className="size-3.5" />Retrabalho Qualidade</p>}
    <Button size="sm" variant="outline" onClick={onDetails}><ExternalLink />Abrir detalhes</Button>
  </div>;
}

export function TimelineView({ onEdit }: { onEdit: (task: Task) => void }) {
  const { filtered, people } = useTasks();
  const today = useToday();
  const [offset, setOffset] = useState(0);
  const [days, setDays] = useState(7);
  const [detail, setDetail] = useState<Task | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  if (!today) return <p className="py-8 text-sm text-muted-foreground">Carregando cronograma…</p>;
  const start = addDays(weekStart(today), offset);
  const dates = Array.from({ length: days }, (_, i) => addDays(start, i));
  const visible = deliveriesBetween(filtered, start, days);
  const rows = [...people.map((person) => ({ ...person, tasks: visible.filter((task) => task.assignees.includes(person.id)) })),
    { id: "unassigned", name: "Sem responsável", role: "", email: "", tasks: visible.filter((task) => task.assignees.length === 0) }];
  const dayWidth = days === 7 ? 144 : 112;
  return <section className="space-y-4" aria-label="Cronograma da equipe">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-xl font-bold">Cronograma da equipe</h2><p className="text-sm text-muted-foreground">{format(start, "dd MMM", { locale: ptBR })} — {format(addDays(start, days - 1), "dd MMM yyyy", { locale: ptBR })} · {visible.length} documentos · Prazos de entrega</p></div>
      <div className="flex flex-wrap items-center gap-2">
        <Tabs value={String(days)} onValueChange={(value) => { setDays(Number(value)); setOffset(0); }}><TabsList><TabsTrigger value="7">Semana</TabsTrigger><TabsTrigger value="28">4 semanas</TabsTrigger></TabsList></Tabs>
        <Button size="icon" variant="outline" aria-label="Período anterior" title="Período anterior" onClick={() => setOffset((value) => value - days)}><ChevronLeft /></Button>
        <Button variant="outline" onClick={() => setOffset(0)}>Hoje</Button>
        <Button size="icon" variant="outline" aria-label="Próximo período" title="Próximo período" onClick={() => setOffset((value) => value + days)}><ChevronRight /></Button>
      </div>
    </div>
    <div className="kanban-scroll max-h-[65vh] overflow-auto border border-border bg-card" role="region" aria-label="Entregas por colaborador" tabIndex={0}>
      <div className="relative" style={{ minWidth: 180 + days * dayWidth }}>
        <div className="sticky top-0 z-30 flex border-b border-border bg-card">
          <div className="sticky left-0 z-40 w-[180px] shrink-0 border-r border-border bg-card p-3 text-xs font-semibold uppercase text-muted-foreground">Colaborador</div>
          {dates.map((date) => <div key={dateKey(date)} style={{ width: dayWidth }} className={cn("shrink-0 border-r border-border px-2 py-2 text-center text-xs", dateKey(date) === dateKey(today) ? "bg-accent font-semibold text-primary" : "text-muted-foreground")}>
            <p className="capitalize">{format(date, "EEE", { locale: ptBR })}</p><p className="mt-1 font-semibold">{format(date, "dd/MM")}{dateKey(date) === dateKey(today) && <span className="ml-1">Hoje</span>}</p>
          </div>)}
        </div>
        {rows.filter((row) => row.id !== "unassigned" || row.tasks.length > 0).map((person) => <div key={person.id} className="flex border-b border-border last:border-0" data-person-id={person.id}>
          <div className="sticky left-0 z-20 w-[180px] shrink-0 border-r border-border bg-card p-3">
            <span className="mb-2 grid size-7 place-items-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">{initials(person.name)}</span>
            <p className="break-words text-sm font-semibold">{person.name}</p><p className="mt-1 text-xs text-muted-foreground">{person.tasks.length} entregas</p>
          </div>
          <div className="relative flex-1" style={{ minHeight: Math.max(112, person.tasks.length * 64 + 16) }}>
            <div className="pointer-events-none absolute inset-0 flex">{dates.map((date) => <div key={dateKey(date)} style={{ width: dayWidth }} className={cn("h-full shrink-0 border-r border-border", dateKey(date) === dateKey(today) && "border-l-2 border-l-primary bg-accent/40")} />)}</div>
            {person.tasks.length === 0 && <p className="relative p-4 text-xs text-muted-foreground">Sem entregas no período</p>}
            {person.tasks.map((task, index) => <div key={task.id} className="absolute px-1" style={{ left: differenceInCalendarDays(parseISO(task.dueDate), start) * dayWidth, top: 8 + index * 64, width: dayWidth }}>
              <Popover open={summary === `${person.id}-${task.id}`} onOpenChange={(open) => setSummary(open ? `${person.id}-${task.id}` : null)}>
                <PopoverTrigger asChild><Button variant="outline" title={`${task.projectCode} — ${task.title}\n${task.status} · Entrega ${fmtDate(task.dueDate)}`} aria-label={`${person.name}: ${task.projectCode} — ${task.title}`} className={cn("h-14 w-full flex-col items-start justify-center gap-0.5 overflow-hidden border-l-4 px-2 text-left", STATUS_STYLE[task.status].badge, STATUS_STYLE[task.status].border)}>
                  <span className="w-full truncate text-[11px] font-bold">{task.projectCode}</span><span className="w-full truncate text-[11px]">{task.title}</span><span className="flex gap-1 text-[10px]">{Boolean(task.qualityRework) && <AlertTriangle className="size-3" />}{fmtDate(task.dueDate).slice(0, 5)}</span>
                </Button></PopoverTrigger>
                <PopoverContent><DeliverySummary task={task} onDetails={() => { setSummary(null); setDetail(task); }} /></PopoverContent>
              </Popover>
            </div>)}
          </div>
        </div>)}
      </div>
    </div>
    <div className="flex flex-wrap gap-3">{STATUSES.map((status) => <span key={status} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><span className={cn("size-2 rounded-full", STATUS_STYLE[status].dot)} />{status}</span>)}</div>
    {visible.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">Nenhuma entrega neste período para os filtros selecionados.</p>}
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