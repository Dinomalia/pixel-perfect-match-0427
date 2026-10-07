import { AlertTriangle, CheckCircle2, Clock, FolderKanban, ListTodo } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { PEOPLE, STATUSES, STATUS_STYLE, useTasks, type Task } from "@/lib/tasks";

function Kpi({ label, value, icon: Icon, tone }: { label: string; value: string | number; icon: typeof ListTodo; tone?: "rework" | "pending" }) {
  return (
    <div className={cn("rounded-xl border border-border bg-card p-5 shadow-card",
      tone === "rework" && "border-status-rework/50 bg-status-rework/5", tone === "pending" && "border-status-pending/50 bg-status-pending/5")}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <Icon className={cn("h-5 w-5 text-primary", tone === "rework" && "text-status-rework", tone === "pending" && "text-status-pending")} />
      </div>
      <p className={cn("mt-2 text-3xl font-bold tracking-tight", tone === "rework" && "text-status-rework", tone === "pending" && "text-status-pending")}>{value}</p>
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
const pct = (ts: Task[]) => (ts.length ? Math.round((ts.filter((t) => t.status === "Aprovado").length / ts.length) * 100) : 0);

function RateRow({ label, sub, ts }: { label: string; sub?: string | undefined; ts: Task[] }) {
  const p = pct(ts);
  return (
    <tr className="border-b border-border last:border-0">
      <td className="py-3 pr-4"><p className="font-medium">{label}</p>{sub && <p className="font-mono text-xs text-primary">{sub}</p>}</td>
      {STATUSES.map((s) => <td key={s} className="py-3 pr-3 text-center">{ts.filter((t) => t.status === s).length}</td>)}
      <td className="py-3 pr-4 text-center font-semibold">{ts.length}</td>
      <td className="py-3"><div className="flex items-center gap-2"><Progress value={p} className="h-2" /><span className="w-10 text-right text-xs font-semibold">{p}%</span></div></td>
    </tr>
  );
}

function RateTable({ rows }: { rows: { key: string; label: string; sub?: string | undefined; ts: Task[] }[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left text-xs uppercase text-muted-foreground">
          <tr className="border-b border-border">
            <th className="py-2 pr-4">Nome</th>
            {STATUSES.map((s) => <th key={s} className="py-2 pr-3 text-center">{s}</th>)}
            <th className="py-2 pr-4 text-center">Total</th><th className="min-w-[160px] py-2">Aprovação</th>
          </tr>
        </thead>
        <tbody>{rows.map((r) => <RateRow key={r.key} label={r.label} sub={r.sub} ts={r.ts} />)}</tbody>
      </table>
    </div>
  );
}

export function DashboardView() {
  const { filtered, projects, companies, docTypes, companyOf } = useTasks();
  const activeProjects = new Set(filtered.map((t) => t.projectCode)).size;
  const count = (s: string) => filtered.filter((t) => t.status === s).length;

  const byStatus = STATUSES.map((s) => ({ name: s, value: count(s), fill: STATUS_STYLE[s].chart }));
  const byPerson = PEOPLE.map((p) => ({ name: p.name.split(" ")[0], value: filtered.filter((t) => t.assignees.includes(p.id)).length })).sort((a, b) => b.value - a.value);
  const byType = docTypes.map((d) => {
    const ts = filtered.filter((t) => t.docType === d);
    const row: Record<string, string | number> = { name: d, total: ts.length };
    STATUSES.forEach((s) => (row[s] = ts.filter((t) => t.status === s).length));
    return row;
  }).filter((r) => (r["total"] as number) > 0);

  const companyRows = companies.map((c) => ({ key: c.id, label: c.name, ts: filtered.filter((t) => companyOf(t.projectCode)?.id === c.id) })).filter((r) => r.ts.length);
  const projectRows = projects.map((p) => ({ key: p.code, label: `${companies.find((c) => c.id === p.companyId)?.name ?? ""} › ${p.name}`, sub: p.code, ts: filtered.filter((t) => t.projectCode === p.code) })).filter((r) => r.ts.length);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
        <Kpi label="Projetos ativos" value={activeProjects} icon={FolderKanban} />
        <Kpi label="Documentos no ciclo" value={filtered.length} icon={ListTodo} />
        <Kpi label="Taxa de retrabalho" value={`${filtered.length ? Math.round((count("Retrabalho") / filtered.length) * 100) : 0}%`} icon={AlertTriangle} tone="rework" />
        <Kpi label="Em aprovação (cliente/DCC)" value={count("Em Aprovação")} icon={Clock} tone="pending" />
        <Kpi label="Taxa de aprovação final" value={`${pct(filtered)}%`} icon={CheckCircle2} />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Distribuição por status">
          <ResponsiveContainer width="100%" height={270}>
            <PieChart>
              <Pie data={byStatus} dataKey="value" nameKey="name" innerRadius={60} outerRadius={95} paddingAngle={2}>
                {byStatus.map((d) => <Cell key={d.name} fill={d.fill} />)}
              </Pie>
              <Tooltip {...tip} /><Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </Panel>
        <Panel title="Volume por tipo de documento">
          <ResponsiveContainer width="100%" height={270}>
            <BarChart data={byType}>
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
              <Tooltip {...tip} cursor={{ fill: "var(--muted)" }} />
              {STATUSES.map((s) => <Bar key={s} dataKey={s} stackId="a" fill={STATUS_STYLE[s].chart} />)}
            </BarChart>
          </ResponsiveContainer>
        </Panel>
        <Panel title="Carga por colaborador">
          <ResponsiveContainer width="100%" height={270}>
            <BarChart data={byPerson} layout="vertical" margin={{ left: 10 }}>
              <CartesianGrid horizontal={false} stroke="var(--border)" />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
              <YAxis type="category" dataKey="name" width={60} tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
              <Tooltip {...tip} cursor={{ fill: "var(--muted)" }} />
              <Bar dataKey="value" name="Documentos" fill="var(--primary)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Aprovação por empresa"><RateTable rows={companyRows} /></Panel>
        <Panel title="Aprovação por projeto"><RateTable rows={projectRows} /></Panel>
      </div>
    </div>
  );
}
