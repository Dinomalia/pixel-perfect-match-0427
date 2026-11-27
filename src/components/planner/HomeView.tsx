import { useMemo, useState } from "react";
import { addDays, format, startOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertTriangle, ArrowRight, CalendarClock, ChevronLeft, ChevronRight, Clock, Copy, Inbox, ListTodo, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { PRIORITIES, daysUntil, getStageColor, getStatusStyle, initials, personById, revOf, STATUS_STYLE, useTasks, type Task } from "@/lib/tasks";
import { DocTypeBadge, DueDate, FolderCopy, GedeLink, PriorityBadge, StatusSelect, copyPath } from "./Shared";
import { TaskViewDialog } from "./TaskViewDialog";

function Kpi({ label, value, icon: Icon, alert }: { label: string; value: number; icon: typeof ListTodo; alert?: boolean }) {
  return (
    <div className={cn("rounded-xl border border-border bg-card p-5 shadow-card", alert && value > 0 && "border-status-rework/50 bg-status-rework/5")}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <Icon className={cn("h-5 w-5 text-primary", alert && value > 0 && "text-status-rework")} />
      </div>
      <p className={cn("mt-2 text-3xl font-bold tracking-tight", alert && value > 0 && "text-status-rework")}>{value}</p>
    </div>
  );
}

const localToday = () => format(new Date(), "yyyy-MM-dd");

export function HomeView({ me, onEdit, onOpenProject }: { me: string; onEdit: (t: Task) => void; onOpenProject: (code: string) => void }) {
  const { tasks, projects, companyOf, phaseOf, stages, timeLogs, addTimeLog, deleteTimeLog } = useTasks();
  const [detail, setDetail] = useState<Task | null>(null);

  // Time tracking form state
  const [docSearch, setDocSearch] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [workDate, setWorkDate] = useState(localToday);
  const [hoursInput, setHoursInput] = useState("1");
  const [logNotes, setLogNotes] = useState("");
  const [weekOffset, setWeekOffset] = useState(0);

  const person = personById(me);
  const mine = tasks.filter((t) => t.assignees.includes(me));
  const open = mine.filter((t) => t.status !== "Aprovado");
  const critical = open.filter((t) => t.priority === "Crítica" || t.status === "Retrabalho");
  const soon = open.filter((t) => { const d = daysUntil(t.dueDate); return d >= 0 && d <= 7; });
  const action = mine.filter((t) => t.status === "Elaboração" || t.status === "Retrabalho");
  const late = open.filter((t) => daysUntil(t.dueDate) < 0).length;

  const myProjects = projects.filter((p) => mine.some((t) => t.projectCode === p.code)).map((p) => {
    const all = tasks.filter((t) => t.projectCode === p.code);
    const my = all.filter((t) => t.assignees.includes(me));
    return { ...p, total: all.length, my: my.length, pct: Math.round((my.filter((t) => t.status === "Aprovado").length / (my.length || 1)) * 100) };
  });

  const queue = [...open].sort((a, b) => PRIORITIES.indexOf(b.priority) - PRIORITIES.indexOf(a.priority) || a.dueDate.localeCompare(b.dueDate));
  const hour = new Date().getHours();
  const hello = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  const today = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });

  // Searchable documents for time logging
  const searchableDocs = useMemo(() => {
    const q = docSearch.toLowerCase().trim();
    const base = tasks;
    if (!q) return base;
    return base.filter((t) =>
      `${t.title} ${t.projectCode} ${t.docType} ${t.sandechCode ?? ""} ${t.clientCode ?? ""}`.toLowerCase().includes(q),
    );
  }, [tasks, docSearch]);

  const activeDocId = selectedTaskId && searchableDocs.some((t) => t.id === selectedTaskId)
    ? selectedTaskId
    : searchableDocs[0]?.id ?? "";

  const handleAddLog = () => {
    if (!activeDocId) { toast.error("Selecione um documento"); return; }
    const h = Number(hoursInput.replace(",", "."));
    if (!workDate) { toast.error("Informe a data"); return; }
    if (!Number.isFinite(h) || h <= 0 || h > 24) { toast.error("Informe uma quantidade válida de horas (ex: 1.5)"); return; }
    addTimeLog({ taskId: activeDocId, personId: me, workDate, hours: Math.round(h * 100) / 100, notes: logNotes.trim() || undefined });
    setLogNotes("");
    toast.success(`${h}h registradas no documento!`);
  };

  // Weekly summary calculation
  const weekStartDate = useMemo(() => {
    const base = startOfWeek(new Date(), { weekStartsOn: 1 });
    return addDays(base, weekOffset * 7);
  }, [weekOffset]);

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = addDays(weekStartDate, i);
    return {
      key: format(d, "yyyy-MM-dd"),
      label: format(d, "EEE", { locale: ptBR }),
      dayNum: format(d, "dd/MM"),
    };
  }), [weekStartDate]);

  const weekLogs = useMemo(() => {
    const from = weekDays[0]!.key;
    const to = weekDays[6]!.key;
    return timeLogs.filter((l) => l.workDate >= from && l.workDate <= to);
  }, [timeLogs, weekDays]);

  const weeklyByDoc = useMemo(() => {
    const map = new Map<string, { task: Task | undefined; byDay: Record<string, number>; total: number }>();
    for (const log of weekLogs) {
      const entry = map.get(log.taskId) ?? { task: tasks.find((t) => t.id === log.taskId), byDay: {} as Record<string, number>, total: 0 };
      entry.byDay[log.workDate] = (entry.byDay[log.workDate] ?? 0) + log.hours;
      entry.total = Math.round((entry.total + log.hours) * 100) / 100;
      map.set(log.taskId, entry);
    }
    return [...map.entries()].map(([taskId, v]) => ({ taskId, ...v })).sort((a, b) => b.total - a.total);
  }, [weekLogs, tasks]);

  const weekTotalHours = useMemo(() => Math.round(weeklyByDoc.reduce((acc, r) => acc + r.total, 0) * 100) / 100, [weeklyByDoc]);

  const copyWeeklySummary = () => {
    if (weeklyByDoc.length === 0) { toast.error("Nenhum apontamento nesta semana"); return; }
    const header = `Resumo Semanal (${weekDays[0]!.dayNum} a ${weekDays[6]!.dayNum}) - ${person?.name ?? "Equipe"}`;
    const cols = ["Código", "Documento", ...weekDays.map((d) => `${d.label} ${d.dayNum}`), "Total (h)"].join("\t");
    const lines = weeklyByDoc.map((r) => {
      const code = r.task?.sandechCode || (r.task ? `${r.task.projectCode}-${r.task.docType}` : r.taskId);
      const title = r.task?.title ?? "Documento removido";
      const daysCols = weekDays.map((d) => (r.byDay[d.key] ? String(r.byDay[d.key]).replace(".", ",") : "0"));
      return [code, title, ...daysCols, String(r.total).replace(".", ",")].join("\t");
    });
    const footer = `Total Geral da Semana: ${String(weekTotalHours).replace(".", ",")} h`;
    void copyPath([header, cols, ...lines, footer].join("\n"), "Resumo da semana copiado!");
  };

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card p-5 shadow-card">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-primary text-lg font-bold text-primary-foreground">{person ? initials(person.name) : "?"}</span>
        <div className="min-w-0">
          <h2 className="text-2xl font-bold tracking-tight">{hello}, {person?.name.split(" ")[0]}</h2>
          <p className="text-sm text-muted-foreground">{person?.role} · <span className="capitalize">{today}</span></p>
          <p className="mt-1 text-sm">Você tem <b>{open.length}</b> documentos em aberto, <b>{soon.length}</b> vencendo esta semana{late > 0 && <>, e <b className="text-destructive">{late} atrasado(s)</b></>}.</p>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Atribuídas a mim" value={mine.length} icon={ListTodo} />
        <Kpi label="Críticas / Em retrabalho" value={critical.length} icon={AlertTriangle} alert />
        <Kpi label="Vencem em 7 dias" value={soon.length} icon={CalendarClock} />
        <Kpi label="Aguardando minha ação" value={action.length} icon={Inbox} />
      </div>

      {/* Cards visíveis diretamente no painel */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Meus documentos em aberto ({queue.length})</h3>
        </div>
        {queue.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground shadow-card">Tudo em dia!</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {queue.map((t) => {
              const st = getStatusStyle(t.status, stages);
              const customBorder = !STATUS_STYLE[t.status] ? getStageColor(t.status, stages) : undefined;
              const phase = phaseOf(t.phaseId);
              return (
                <article
                  key={t.id}
                  onClick={() => setDetail(t)}
                  style={customBorder ? { borderLeftColor: customBorder } : undefined}
                  className={cn("flex cursor-pointer flex-col gap-2.5 rounded-xl border border-border border-l-4 bg-card p-4 shadow-card transition hover:shadow-card-hover", st.border)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      {companyOf(t.projectCode)?.name} • {t.projectCode}{phase ? ` • ${phase.name}` : ""}
                    </p>
                    <div className="flex shrink-0 items-center gap-1">
                      <span className="rounded bg-primary px-1.5 py-0.5 text-[11px] font-bold text-primary-foreground">Rev. {revOf(t)}</span>
                      <DocTypeBadge type={t.docType} />
                    </div>
                  </div>
                  {t.sandechCode && <p className="truncate font-mono text-[11px] font-medium text-muted-foreground">{t.sandechCode}</p>}
                  <h4 className="text-sm font-semibold leading-snug">{t.title}</h4>
                  <div className="flex flex-wrap items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
                    <StatusSelect task={t} />
                    <PriorityBadge priority={t.priority} />
                  </div>
                  <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2.5">
                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <DueDate task={t} />
                      <GedeLink url={t.gedeUrl} />
                      <FolderCopy path={t.folderPath} />
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-7 gap-1 px-2 text-xs"
                      onClick={(e) => { e.stopPropagation(); onEdit(t); }}
                    >
                      <Pencil className="h-3 w-3" />Editar
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Apontamento Diário de Horas + Resumo Semanal */}
      <div className="grid gap-6 lg:grid-cols-5">
        <section className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-card lg:col-span-2">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Apontamento Diário de Horas</h3>
          </div>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Buscar documento (código ou nome)</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input className="pl-8 text-sm" placeholder="Filtrar por código SANDECH, projeto ou título..." value={docSearch} onChange={(e) => setDocSearch(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Documento</Label>
              <Select value={activeDocId} onValueChange={setSelectedTaskId}>
                <SelectTrigger><SelectValue placeholder="Selecione um documento" /></SelectTrigger>
                <SelectContent>
                  {searchableDocs.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.sandechCode ? `${t.sandechCode} · ` : `${t.projectCode} [${t.docType}] · `}{t.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Data</Label>
                <Input type="date" value={workDate} onChange={(e) => setWorkDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Horas (ex: 1.5)</Label>
                <Input type="number" step="0.25" min="0.25" max="24" value={hoursInput} onChange={(e) => setHoursInput(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Observação (opcional)</Label>
              <Input placeholder="Ex.: elaboração da folha de dados" value={logNotes} onChange={(e) => setLogNotes(e.target.value)} maxLength={200} />
            </div>
            <Button type="button" className="w-full" onClick={handleAddLog}><Plus className="mr-1.5 h-4 w-4" />Registrar horas</Button>
          </div>

          {timeLogs.length > 0 && (
            <div className="space-y-2 border-t border-border pt-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Últimos lançamentos</p>
              <div className="max-h-48 space-y-1.5 overflow-y-auto pr-1">
                {timeLogs.slice(0, 10).map((l) => {
                  const t = tasks.find((x) => x.id === l.taskId);
                  return (
                    <div key={l.id} className="flex items-center justify-between gap-2 rounded-md border border-border bg-muted/40 px-2.5 py-1.5 text-xs">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{t?.title ?? "Documento"}</p>
                        <p className="text-[11px] text-muted-foreground">{l.workDate.split("-").reverse().join("/")} · <b>{l.hours}h</b>{l.notes ? ` · ${l.notes}` : ""}</p>
                      </div>
                      <Button type="button" size="icon" variant="ghost" className="h-6 w-6 shrink-0 text-destructive" onClick={() => deleteTimeLog(l.id)} aria-label="Excluir lançamento">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        <section className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-card lg:col-span-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Resumo da Semana</h3>
              <p className="text-xs text-muted-foreground">
                {weekDays[0]!.dayNum} a {weekDays[6]!.dayNum} · Total: <b className="text-foreground">{weekTotalHours}h</b>
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <Button type="button" size="icon" variant="outline" className="h-8 w-8" onClick={() => setWeekOffset((w) => w - 1)} aria-label="Semana anterior"><ChevronLeft className="h-4 w-4" /></Button>
              <Button type="button" size="sm" variant="outline" onClick={() => setWeekOffset(0)}>Semana atual</Button>
              <Button type="button" size="icon" variant="outline" className="h-8 w-8" onClick={() => setWeekOffset((w) => w + 1)} aria-label="Próxima semana"><ChevronRight className="h-4 w-4" /></Button>
              <Button type="button" size="sm" variant="secondary" onClick={copyWeeklySummary}><Copy className="mr-1.5 h-3.5 w-3.5" />Copiar resumo</Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="border-b border-border text-left text-muted-foreground">
                <tr>
                  <th className="py-2 pr-3 font-semibold">Documento</th>
                  {weekDays.map((d) => (
                    <th key={d.key} className="px-2 py-2 text-center font-semibold capitalize">
                      <div>{d.label}</div>
                      <div className="text-[10px] font-normal">{d.dayNum}</div>
                    </th>
                  ))}
                  <th className="py-2 pl-2 text-right font-semibold">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {weeklyByDoc.map((row) => (
                  <tr key={row.taskId}>
                    <td className="max-w-[220px] py-2.5 pr-3">
                      <p className="truncate font-medium text-foreground">{row.task?.title ?? "Documento removido"}</p>
                      <p className="truncate font-mono text-[10px] text-muted-foreground">{row.task?.sandechCode || row.task?.projectCode}</p>
                    </td>
                    {weekDays.map((d) => (
                      <td key={d.key} className="px-2 py-2.5 text-center tabular-nums">
                        {row.byDay[d.key] ? <span className="font-semibold text-primary">{row.byDay[d.key]}h</span> : <span className="text-muted-foreground/50">—</span>}
                      </td>
                    ))}
                    <td className="py-2.5 pl-2 text-right font-bold tabular-nums text-foreground">{row.total}h</td>
                  </tr>
                ))}
                {weeklyByDoc.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-sm text-muted-foreground">Nenhuma hora apontada nesta semana.</td>
                  </tr>
                )}
              </tbody>
              {weeklyByDoc.length > 0 && (
                <tfoot className="border-t-2 border-border font-bold">
                  <tr>
                    <td className="py-2.5 pr-3">Total da semana</td>
                    {weekDays.map((d) => {
                      const daySum = Math.round(weekLogs.filter((l) => l.workDate === d.key).reduce((a, b) => a + b.hours, 0) * 100) / 100;
                      return <td key={d.key} className="px-2 py-2.5 text-center tabular-nums">{daySum > 0 ? `${daySum}h` : "—"}</td>;
                    })}
                    <td className="py-2.5 pl-2 text-right tabular-nums text-primary">{weekTotalHours}h</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </section>
      </div>

      <section>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Meus projetos ativos</h3>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {myProjects.map((p) => (
            <div key={p.code} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 shadow-card">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{companyOf(p.code)?.name}</p>
                <p className="font-mono text-sm font-semibold text-primary">{p.code}</p>
                <p className="font-semibold">{p.name}</p>
              </div>
              <div>
                <div className="mb-1 flex justify-between text-xs text-muted-foreground"><span>Meus documentos aprovados</span><span className="font-semibold text-foreground">{p.pct}%</span></div>
                <Progress value={p.pct} className="h-2" />
                <p className="mt-1 text-xs text-muted-foreground">{p.my} de {p.total} documentos do projeto são seus</p>
              </div>
              <Button variant="outline" size="sm" className="mt-auto self-start" onClick={() => onOpenProject(p.code)}>Abrir quadro <ArrowRight className="h-4 w-4" /></Button>
            </div>
          ))}
          {myProjects.length === 0 && <p className="text-sm text-muted-foreground">Nenhum projeto alocado.</p>}
        </div>
      </section>

      <TaskViewDialog task={detail} onClose={() => setDetail(null)} onEdit={onEdit} />
    </div>
  );
}
