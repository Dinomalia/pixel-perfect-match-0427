import { useMemo, useState } from "react";
import { ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { STATUSES, fmtDate, personById, useTasks, type Task } from "@/lib/tasks";
import { Avatars, GedeLink, PriorityBadge, StatusBadge } from "./Shared";

type Key = "projectCode" | "project" | "person" | "dueDate" | "status" | "title";
const PAGE = 8;

export function TableView({ onEdit }: { onEdit: (t: Task) => void }) {
  const { filtered, projects } = useTasks();
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState<{ key: Key; dir: 1 | -1 }>({ key: "dueDate", dir: 1 });
  const [page, setPage] = useState(0);

  const rows = useMemo(() => {
    const pname = (c: string) => projects.find((p) => p.code === c)?.name ?? "";
    const val = (t: Task): string => {
      switch (sort.key) {
        case "project": return pname(t.projectCode);
        case "person": return personById(t.assignees[0] ?? "")?.name ?? "";
        case "status": return String(STATUSES.indexOf(t.status));
        default: return t[sort.key];
      }
    };
    return filtered.filter((t) => status === "all" || t.status === status)
      .sort((a, b) => val(a).localeCompare(val(b)) * sort.dir);
  }, [filtered, status, sort, projects]);

  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const cur = Math.min(page, pages - 1);
  const slice = rows.slice(cur * PAGE, cur * PAGE + PAGE);

  const H = ({ k, children }: { k: Key; children: React.ReactNode }) => (
    <th className="px-4 py-3">
      <button className="inline-flex items-center gap-1 uppercase hover:text-foreground" onClick={() => setSort((s) => ({ key: k, dir: s.key === k ? (s.dir === 1 ? -1 : 1) : 1 }))}>
        {children}<ArrowUpDown className="h-3 w-3" />
      </button>
    </th>
  );

  return (
    <div className="rounded-xl border border-border bg-card shadow-card">
      <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
        <span className="text-sm font-medium text-muted-foreground">Status:</span>
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(0); }}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">Todos</SelectItem>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
        </Select>
        <span className="ml-auto text-sm text-muted-foreground">{rows.length} tarefas</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-left text-xs text-muted-foreground">
            <tr><H k="projectCode">Código</H><H k="project">Projeto</H><H k="title">Tarefa</H><H k="person">Responsável</H><H k="dueDate">Prazo</H><H k="status">Status</H><th className="px-4 py-3 uppercase">Prioridade</th><th className="px-4 py-3 uppercase">GEDE</th></tr>
          </thead>
          <tbody>
            {slice.map((t) => (
              <tr key={t.id} onClick={() => onEdit(t)} className="cursor-pointer border-t border-border hover:bg-accent/50">
                <td className="px-4 py-3 font-mono text-xs font-semibold text-primary">{t.projectCode}</td>
                <td className="px-4 py-3">{projects.find((p) => p.code === t.projectCode)?.name}</td>
                <td className="px-4 py-3 font-medium">{t.title}</td>
                <td className="px-4 py-3"><div className="flex items-center gap-2"><Avatars ids={t.assignees} /><span className="truncate text-xs text-muted-foreground">{personById(t.assignees[0] ?? "")?.name}</span></div></td>
                <td className="whitespace-nowrap px-4 py-3">{fmtDate(t.dueDate)}</td>
                <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                <td className="px-4 py-3"><PriorityBadge priority={t.priority} /></td>
                <td className="px-4 py-3"><GedeLink url={t.gedeUrl} /></td>
              </tr>
            ))}
            {slice.length === 0 && <tr><td colSpan={8} className="py-10 text-center text-muted-foreground">Nenhuma tarefa encontrada</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-end gap-2 border-t border-border p-3 text-sm">
        <span className="text-muted-foreground">Página {cur + 1} de {pages}</span>
        <Button size="icon" variant="outline" className="h-8 w-8" disabled={cur === 0} onClick={() => setPage(cur - 1)}><ChevronLeft className="h-4 w-4" /></Button>
        <Button size="icon" variant="outline" className="h-8 w-8" disabled={cur >= pages - 1} onClick={() => setPage(cur + 1)}><ChevronRight className="h-4 w-4" /></Button>
      </div>
    </div>
  );
}
