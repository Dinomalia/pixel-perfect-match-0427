import { useEffect, useMemo, useState } from "react";
import { addDays, differenceInCalendarDays, format, isWeekend, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertTriangle, CalendarDays, ChevronDown, ChevronLeft, ChevronRight, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { fmtDate, getStageColor, getStatusStyle, initials, personById, STATUS_STYLE, useTasks, type Task } from "@/lib/tasks";
import { dateKey, deliveryAlert, ganttStart, personalDeliveries, weekStart } from "@/lib/timeline";
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
  const { filtered, people, projects, stages, companyOf, phaseOf } = useTasks();
  const today = useToday();
  const [offset, setOffset] = useState(0);
  const [zoom, setZoom] = useState<"day" | "week">("day");
  const [sidebarHidden, setSidebarHidden] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [detail, setDetail] = useState<Task | null>(null);

  const days = zoom === "day" ? 42 : 70;
  const dayWidth = zoom === "day" ? 32 : 18;
  const sideW = sidebarHidden ? 0 : 320;
  const rowH = 42;

  const start = useMemo(() => (today ? addDays(weekStart(today), offset - 7) : new Date()), [today, offset]);
  const dates = useMemo(() => Array.from({ length: days }, (_, i) => addDays(start, i)), [start, days]);

  const monthSpans = useMemo(() => {
    const spans: { label: string; count: number }[] = [];
    for (const d of dates) {
      const label = format(d, "MMMM yyyy", { locale: ptBR });
      const last = spans[spans.length - 1];
      if (last && last.label === label) last.count += 1;
      else spans.push({ label, count: 1 });
    }
    return spans;
  }, [dates]);

  if (!today) return <p className="py-8 text-sm text-muted-foreground">Carregando cronograma…</p>;

  const live = filtered.filter((t) => !t.deletedAt && t.dueDate);
  const nameOf = (id: string) => people.find((p) => p.id === id)?.name;

  // Group by Project + Phase
  const groupKeys = [...new Set(live.map((t) => `${t.projectCode}::${t.phaseId ?? ""}`))].sort();
  const groups = groupKeys.map((key) => {
    const [code, phId] = key.split("::");
    const list = live.filter((t) => t.projectCode === code && (t.phaseId ?? "") === (phId ?? "")).sort((x, y) => x.dueDate.localeCompare(y.dueDate));
    return { key, code: code!, phaseId: phId || undefined, tasks: list };
  });

  const taskStartDate = (t: Task) => (t.startDate ? parseISO(t.startDate) : ganttStart(t));
  const todayIdx = differenceInCalendarDays(today, start);

  return (
    <section className="space-y-4" aria-label="Cronograma Gantt">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Cronograma</h2>
          <p className="text-sm text-muted-foreground">
            {format(start, "dd MMM", { locale: ptBR })} — {format(addDays(start, days - 1), "dd MMM yyyy", { locale: ptBR })} · {live.length} documento(s)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {sidebarHidden && (
            <Button type="button" size="sm" variant="outline" onClick={() => setSidebarHidden(false)}>
              <PanelLeftOpen className="mr-1.5 h-4 w-4" />Mostrar painel
            </Button>
          )}
          <Tabs value={zoom} onValueChange={(v) => setZoom(v as "day" | "week")}>
            <TabsList className="h-9">
              <TabsTrigger value="day" className="text-xs">Dia</TabsTrigger>
              <TabsTrigger value="week" className="text-xs">Semana</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button size="icon" variant="outline" aria-label="Período anterior" onClick={() => setOffset((v) => v - 14)}><ChevronLeft /></Button>
          <Button variant="outline" onClick={() => setOffset(0)}>Hoje</Button>
          <Button size="icon" variant="outline" aria-label="Próximo período" onClick={() => setOffset((v) => v + 14)}><ChevronRight /></Button>
        </div>
      </div>

      {/* Legenda de cores sincronizada com as etapas do Kanban */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card px-3.5 py-2 text-xs text-muted-foreground">
        {stages.map((st) => (
          <span key={st.id} className="inline-flex items-center gap-1.5 font-medium text-foreground">
            <span className="size-2.5 rounded-full" style={{ backgroundColor: st.color }} />
            {st.name}
          </span>
        ))}
      </div>

      <div className="kanban-scroll max-h-[72vh] overflow-auto rounded-xl border border-border bg-card shadow-card" role="region" aria-label="Gantt de documentos" tabIndex={0}>
        <div style={{ minWidth: sideW + days * dayWidth }}>
          {/* Cabeçalho agrupado por Mês/Ano + Dia */}
          <div className="sticky top-0 z-30 flex border-b border-border bg-card">
            {!sidebarHidden && (
              <div
                style={{ width: sideW }}
                className="sticky left-0 z-40 flex shrink-0 items-center justify-between border-r border-border bg-card px-3 py-2 text-xs font-semibold uppercase text-muted-foreground"
              >
                <span>Projeto / Documento</span>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6"
                  title="Recolher painel lateral"
                  aria-label="Recolher painel lateral"
                  onClick={() => setSidebarHidden(true)}
                >
                  <PanelLeftClose className="h-4 w-4" />
                </Button>
              </div>
            )}
            <div className="flex flex-col">
              <div className="flex border-b border-border bg-muted/40">
                {monthSpans.map((m, idx) => (
                  <div
                    key={`${m.label}-${idx}`}
                    style={{ width: m.count * dayWidth }}
                    className="shrink-0 truncate border-r border-border px-2 py-1 text-[11px] font-semibold capitalize text-foreground"
                  >
                    {m.label}
                  </div>
                ))}
              </div>
              <div className="flex">
                {dates.map((d) => {
                  const isToday = dateKey(d) === dateKey(today);
                  const weekend = isWeekend(d);
                  return (
                    <div
                      key={dateKey(d)}
                      style={{ width: dayWidth }}
                      className={cn(
                        "shrink-0 border-r border-border py-1 text-center text-[10px]",
                        weekend && "bg-muted/60",
                        isToday ? "bg-primary/15 font-bold text-primary" : "text-muted-foreground",
                      )}
                    >
                      {zoom === "day" ? (
                        <>
                          <p className="capitalize">{format(d, "EEEEE", { locale: ptBR })}</p>
                          <p>{format(d, "dd")}</p>
                        </>
                      ) : (
                        <p>{d.getDay() === 1 ? format(d, "dd") : ""}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {groups.map((g) => {
            const open = !collapsed[g.key];
            const proj = projects.find((p) => p.code === g.code);
            const phase = phaseOf(g.phaseId);

            // Summary bar range for project/phase group
            const groupStarts = g.tasks.map((t) => differenceInCalendarDays(taskStartDate(t), start));
            const groupEnds = g.tasks.map((t) => differenceInCalendarDays(parseISO(t.dueDate), start) + 1);
            const gLeft = Math.max(0, Math.min(...groupStarts));
            const gRight = Math.min(days, Math.max(...groupEnds));

            return (
              <div key={g.key}>
                <div className="flex border-b border-border bg-muted/40">
                  {!sidebarHidden && (
                    <button
                      type="button"
                      aria-expanded={open}
                      onClick={() => setCollapsed((c) => ({ ...c, [g.key]: open }))}
                      style={{ width: sideW }}
                      className="sticky left-0 z-20 flex shrink-0 items-center gap-1.5 border-r border-border bg-muted/80 px-3 py-2 text-left text-xs font-bold"
                    >
                      {open ? <ChevronDown className="size-4 shrink-0" /> : <ChevronRight className="size-4 shrink-0" />}
                      <span className="truncate">
                        {companyOf(g.code)?.name} • {g.code}{phase ? ` · ${phase.name}` : ""}
                      </span>
                      <span className="ml-auto shrink-0 rounded-full bg-card px-1.5 text-[10px] font-medium text-muted-foreground">{g.tasks.length}</span>
                    </button>
                  )}
                  <div className="relative flex-1 py-2">
                    {sidebarHidden && (
                      <button
                        type="button"
                        onClick={() => setCollapsed((c) => ({ ...c, [g.key]: open }))}
                        className="relative z-10 flex items-center gap-1.5 px-3 text-xs font-bold"
                      >
                        {open ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                        {companyOf(g.code)?.name} • {g.code}{phase ? ` · ${phase.name}` : ""} ({g.tasks.length})
                      </button>
                    )}
                    {gRight > gLeft && (
                      <div
                        className="pointer-events-none absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-primary/35"
                        style={{ left: gLeft * dayWidth + 2, width: Math.max(6, (gRight - gLeft) * dayWidth - 4) }}
                      />
                    )}
                  </div>
                </div>

                {open && g.tasks.map((t) => {
                  const sDate = taskStartDate(t);
                  const s = differenceInCalendarDays(sDate, start);
                  const e = differenceInCalendarDays(parseISO(t.dueDate), start) + 1;
                  const left = Math.max(0, s);
                  const right = Math.min(days, e);
                  const ownerNames = t.assignees.map((id) => nameOf(id)).filter(Boolean).join(", ") || "Sem responsável";
                  const owner = t.assignees[0] ? nameOf(t.assignees[0]) : undefined;
                  const barHex = getStageColor(t.status, stages);
                  const compactLabel = `${t.docType} · ${t.sandechCode || t.projectCode}`;

                  return (
                    <div key={t.id} className="flex border-b border-border/80 hover:bg-muted/20" style={{ height: rowH }}>
                      {!sidebarHidden && (
                        <button
                          type="button"
                          onClick={() => setDetail(t)}
                          style={{ width: sideW }}
                          className="sticky left-0 z-20 flex shrink-0 items-center gap-2 border-r border-border bg-card py-1 pl-7 pr-3 text-left hover:bg-accent"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-mono text-[10px] font-semibold text-muted-foreground">
                              [{t.docType}] {t.sandechCode || t.projectCode}
                            </p>
                            <p className="truncate text-xs font-medium">{t.title}</p>
                          </div>
                          {owner && (
                            <span title={owner} className="grid size-6 shrink-0 place-items-center rounded-full bg-primary/10 text-[9px] font-bold text-primary">
                              {initials(owner)}
                            </span>
                          )}
                        </button>
                      )}

                      <div className="relative flex-1">
                        <div className="pointer-events-none absolute inset-0 flex">
                          {dates.map((d) => (
                            <div
                              key={dateKey(d)}
                              style={{ width: dayWidth }}
                              className={cn(
                                "h-full shrink-0 border-r border-border/40",
                                isWeekend(d) && "bg-muted/50",
                              )}
                            />
                          ))}
                        </div>

                        {todayIdx >= 0 && todayIdx < days && (
                          <div
                            className="pointer-events-none absolute inset-y-0 z-10 w-0.5 bg-primary/80"
                            style={{ left: todayIdx * dayWidth + dayWidth / 2 }}
                          />
                        )}

                        {right > left && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                onClick={() => setDetail(t)}
                                className="absolute top-1.5 z-10 flex h-7 items-center overflow-hidden rounded-md px-2 text-left text-[11px] font-semibold text-white shadow-sm transition hover:brightness-110"
                                style={{
                                  left: left * dayWidth + 2,
                                  width: Math.max(24, (right - left) * dayWidth - 4),
                                  backgroundColor: barHex,
                                }}
                              >
                                <span className="truncate">{compactLabel}</span>
                              </button>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs space-y-1 p-3 text-xs">
                              <p className="font-bold">{t.title}</p>
                              <p className="text-muted-foreground">
                                {companyOf(t.projectCode)?.name} · {proj?.code}{phase ? ` (${phase.name})` : ""}
                              </p>
                              <p><b>Status:</b> {t.status}</p>
                              <p><b>Responsável:</b> {ownerNames}</p>
                              <p><b>Período:</b> {fmtDate(dateKey(sDate))} até {fmtDate(t.dueDate)}</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {live.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">Nenhum documento para os filtros selecionados.</p>}
      <TaskViewDialog task={detail} onClose={() => setDetail(null)} onEdit={onEdit} />
    </section>
  );
}

export function PersonalTimeline({ me, onEdit }: { me: string; onEdit: (task: Task) => void }) {
  const { tasks, stages } = useTasks();
  const today = useToday();
  const [detail, setDetail] = useState<Task | null>(null);
  const deliveries = today ? personalDeliveries(tasks, me, today) : [];
  const weeks = [...new Set(deliveries.map((task) => dateKey(weekStart(parseISO(task.dueDate)))))];
  return (
    <section aria-label="Meu Cronograma de Entregas">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          <CalendarDays className="size-4" />Meu Cronograma de Entregas
        </h3>
        <span className="text-xs text-muted-foreground">Próximos 30 dias · {deliveries.length} entregas</span>
      </div>
      {weeks.map((week) => (
        <div key={week} className="mb-4">
          <p className="mb-2 text-xs font-semibold text-muted-foreground">Semana de {format(parseISO(week), "dd MMM", { locale: ptBR })}</p>
          <div className="ml-2 space-y-2 border-l-2 border-border pl-4">
            {deliveries.filter((task) => dateKey(weekStart(parseISO(task.dueDate))) === week).map((task) => {
              const alert = today ? deliveryAlert(task, today) : false;
              const st = getStatusStyle(task.status, stages);
              const customColor = !STATUS_STYLE[task.status] ? getStageColor(task.status, stages) : undefined;
              return (
                <div key={task.id} className={cn("relative flex flex-wrap items-center gap-3 border-b border-border py-3", alert && "border-status-rework/40")}>
                  <span
                    className={cn("absolute -left-[23px] top-5 size-3 rounded-full border-2 border-background", alert ? "bg-status-rework" : !customColor && st.dot)}
                    style={!alert && customColor ? { backgroundColor: customColor } : undefined}
                  />
                  <div className={cn("w-14 shrink-0 text-sm font-bold", alert ? "text-status-rework" : "text-foreground")}>
                    {fmtDate(task.dueDate).slice(0, 5)}
                    <p className="text-[10px] font-normal capitalize text-muted-foreground">{format(parseISO(task.dueDate), "EEE", { locale: ptBR })}</p>
                  </div>
                  <div className="min-w-0 flex-1 basis-48">
                    <p className="break-words text-sm font-semibold">{task.title}</p>
                    <p className="text-xs text-muted-foreground">{task.projectCode} · [{task.docType}]</p>
                    {alert && (
                      <p className="mt-1 flex items-center gap-1 text-xs font-medium text-status-rework">
                        <AlertTriangle className="size-3" />
                        {task.qualityRework ? "Retrabalho Qualidade" : task.dueDate === dateKey(today ?? new Date()) ? "Entrega hoje" : "Vence em menos de 7 dias"}
                      </p>
                    )}
                  </div>
                  <StatusBadge status={task.status} />
                  <Button size="sm" variant="outline" onClick={() => setDetail(task)}>Ver detalhes<ChevronRight /></Button>
                </div>
              );
            })}
          </div>
        </div>
      ))}
      {today && deliveries.length === 0 && <p className="border-y border-border py-6 text-center text-sm text-muted-foreground">Nenhuma entrega atribuída a você nos próximos 30 dias.</p>}
      <TaskViewDialog task={detail} onClose={() => setDetail(null)} onEdit={onEdit} />
    </section>
  );
}
