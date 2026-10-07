import { AlertTriangle, ArrowRight, CalendarClock, Inbox, ListTodo } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { PRIORITIES, daysUntil, initials, personById, useTasks, type Task } from "@/lib/tasks";
import { DocTypeBadge, DueDate, GedeLink, PriorityBadge, StatusSelect } from "./Shared";

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

export function HomeView({ me, onEdit, onOpenProject }: { me: string; onEdit: (t: Task) => void; onOpenProject: (code: string) => void }) {
  const { tasks, projects, companyOf } = useTasks();
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

      <section className="rounded-xl border border-border bg-card p-5 shadow-card">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Fila rápida de tarefas</h3>
        <div className="divide-y divide-border">
          {queue.map((t) => (
            <div key={t.id} className="flex flex-wrap items-center gap-3 py-2.5">
              <DocTypeBadge type={t.docType} />
              <button className="min-w-[200px] flex-1 text-left" onClick={() => onEdit(t)}>
                <p className="text-sm font-semibold hover:underline">{t.title}</p>
                <p className="text-xs text-muted-foreground">{companyOf(t.projectCode)?.name} • {t.projectCode}</p>
              </button>
              <PriorityBadge priority={t.priority} />
              <StatusSelect task={t} />
              <DueDate task={t} />
              <GedeLink url={t.gedeUrl} />
            </div>
          ))}
          {queue.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Tudo em dia!</p>}
        </div>
      </section>
    </div>
  );
}
