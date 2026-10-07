import { AlertTriangle, CheckCircle2, FolderKanban, ListTodo } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { PEOPLE, STATUSES, STATUS_STYLE, useTasks } from "@/lib/tasks";

function Kpi({ label, value, icon: Icon, alert }: { label: string; value: string | number; icon: typeof ListTodo; alert?: boolean }) {
  return (
    <div className={cn("rounded-xl border border-border bg-card p-5 shadow-card", alert && "border-status-rework/50 bg-status-rework/5")}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <Icon className={cn("h-5 w-5 text-primary", alert && "text-status-rework")} />
      </div>
      <p className={cn("mt-2 text-3xl font-bold tracking-tight", alert && "text-status-rework")}>{value}</p>
    </div>
  );
}

function Panel({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-xl border border-border bg-card p-5 shadow-card", className)}>
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      {children}
    </div>
  );
}

const tip = { contentStyle: { background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 } };

export function DashboardView() {
  const { filtered, projects } = useTasks();
  const activeProjects = new Set(filtered.map((t) => t.projectCode)).size;
  const rework = filtered.filter((t) => t.status === "Retrabalho").length;
  const approved = filtered.filter((t) => t.status === "Aprovado").length;
  const rate = filtered.length ? Math.round((approved / filtered.length) * 100) : 0;

  const byStatus = STATUSES.map((s) => ({ name: s, value: filtered.filter((t) => t.status === s).length, fill: STATUS_STYLE[s].chart }));
  const byPerson = PEOPLE.map((p) => ({ name: p.name.split(" ")[0], value: filtered.filter((t) => t.assignees.includes(p.id)).length })).sort((a, b) => b.value - a.value);
  const byProject = projects.map((p) => {
    const ts = filtered.filter((t) => t.projectCode === p.code);
    const row: Record<string, string | number> = { name: p.code, fullName: p.name, total: ts.length };
    STATUSES.forEach((s) => (row[s] = ts.filter((t) => t.status === s).length));
    return row;
  }).filter((r) => (r["total"] as number) > 0);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Projetos ativos" value={activeProjects} icon={FolderKanban} />
        <Kpi label="Total de tarefas" value={filtered.length} icon={ListTodo} />
        <Kpi label="Em retrabalho" value={rework} icon={AlertTriangle} alert={rework > 0} />
        <Kpi label="Taxa de aprovação" value={`${rate}%`} icon={CheckCircle2} />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Tarefas por status">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={byStatus} dataKey="value" nameKey="name" innerRadius={60} outerRadius={95} paddingAngle={2}>
                {byStatus.map((d) => <Cell key={d.name} fill={d.fill} />)}
              </Pie>
              <Tooltip {...tip} /><Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </Panel>
        <Panel title="Carga por colaborador">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={byPerson} layout="vertical" margin={{ left: 10 }}>
              <CartesianGrid horizontal={false} stroke="var(--border)" />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
              <YAxis type="category" dataKey="name" width={60} tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
              <Tooltip {...tip} cursor={{ fill: "var(--muted)" }} />
              <Bar dataKey="value" name="Tarefas" fill="var(--primary)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>
        <Panel title="Volume por projeto">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={byProject}>
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
              <Tooltip {...tip} cursor={{ fill: "var(--muted)" }} />
              {STATUSES.map((s) => <Bar key={s} dataKey={s} stackId="a" fill={STATUS_STYLE[s].chart} />)}
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      </div>
      <Panel title="Resumo dos projetos">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground">
              <tr className="border-b border-border">
                <th className="py-2 pr-4">Código</th><th className="py-2 pr-4">Projeto</th>
                {STATUSES.map((s) => <th key={s} className="py-2 pr-4 text-center">{s}</th>)}
                <th className="py-2 pr-4 text-center">Total</th><th className="min-w-[180px] py-2">Conclusão</th>
              </tr>
            </thead>
            <tbody>
              {byProject.map((r) => {
                const pct = Math.round(((r["Aprovado"] as number) / (r["total"] as number)) * 100);
                return (
                  <tr key={r["name"]} className="border-b border-border last:border-0">
                    <td className="py-3 pr-4 font-mono text-xs font-semibold text-primary">{r["name"]}</td>
                    <td className="py-3 pr-4 font-medium">{r["fullName"]}</td>
                    {STATUSES.map((s) => <td key={s} className="py-3 pr-4 text-center">{r[s]}</td>)}
                    <td className="py-3 pr-4 text-center font-semibold">{r["total"]}</td>
                    <td className="py-3"><div className="flex items-center gap-2"><Progress value={pct} className="h-2" /><span className="w-10 text-right text-xs font-semibold">{pct}%</span></div></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
