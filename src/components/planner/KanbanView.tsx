import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PEOPLE, STATUSES, STATUS_STYLE, initials, useTasks, type Status, type Task } from "@/lib/tasks";
import { Avatars, DocTypeBadge, DueDate, GedeLink, PriorityBadge, StatusSelect } from "./Shared";

export type GroupBy = "status" | "person" | "project";
type Col = { key: string; title: string; sub?: string; dot?: string; avatar?: string; items: Task[] };

export function KanbanView({ groupBy, onEdit, onNew }: { groupBy: GroupBy; onEdit: (t: Task) => void; onNew: (s: Status) => void }) {
  const { filtered, companyOf, moveTask, upsertTask, projects } = useTasks();
  const [over, setOver] = useState<string | null>(null);

  let cols: Col[];
  if (groupBy === "status") {
    cols = STATUSES.map((s) => ({ key: s, title: s, dot: STATUS_STYLE[s].dot, items: filtered.filter((t) => t.status === s) }));
  } else if (groupBy === "person") {
    cols = PEOPLE.map((p) => ({ key: p.id, title: p.name, sub: p.role, avatar: initials(p.name), items: filtered.filter((t) => t.assignees.includes(p.id)) }));
  } else {
    const codes = [...new Set(filtered.map((t) => t.projectCode))];
    cols = projects.filter((p) => codes.includes(p.code)).map((p) => ({ key: p.code, title: p.code, sub: `${companyOf(p.code)?.name ?? ""} · ${p.name}`, items: filtered.filter((t) => t.projectCode === p.code) }));
  }

  const drop = (id: string, key: string) => {
    const t = filtered.find((x) => x.id === id);
    if (!t) return;
    if (groupBy === "status") moveTask(id, key as Status);
    else if (groupBy === "project") upsertTask({ ...t, projectCode: key });
    else if (!t.assignees.includes(key)) upsertTask({ ...t, assignees: [key] });
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {cols.map((c) => (
        <section key={c.key}
          onDragOver={(e) => { e.preventDefault(); setOver(c.key); }}
          onDragLeave={() => setOver(null)}
          onDrop={(e) => { e.preventDefault(); const id = e.dataTransfer.getData("text/plain"); if (id) drop(id, c.key); setOver(null); }}
          className={cn("flex min-h-[60vh] w-[300px] shrink-0 flex-col rounded-xl border border-border bg-muted/60 p-3 transition-colors", over === c.key && "border-primary bg-accent")}>
          <header className="mb-3 flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              {c.dot && <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", c.dot)} />}
              {c.avatar && <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">{c.avatar}</span>}
              <div className="min-w-0">
                <h2 className="truncate font-semibold leading-tight">{c.title}</h2>
                {c.sub && <p className="truncate text-xs text-muted-foreground">{c.sub}</p>}
              </div>
              <span className="rounded-full bg-card px-2 text-xs text-muted-foreground">{c.items.length}</span>
            </div>
            {groupBy === "status" && <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onNew(c.key as Status)} aria-label={`Novo documento em ${c.title}`}><Plus className="h-4 w-4" /></Button>}
          </header>
          <div className="flex flex-1 flex-col gap-2.5">
            {c.items.map((t) => (
              <article key={t.id} draggable onDragStart={(e) => e.dataTransfer.setData("text/plain", t.id)} onClick={() => onEdit(t)}
                className={cn("cursor-grab space-y-2 rounded-lg border border-border border-l-4 bg-card p-3 shadow-card transition hover:shadow-card-hover active:cursor-grabbing", STATUS_STYLE[t.status].border)}>
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{companyOf(t.projectCode)?.name} • {t.projectCode}</p>
                  <DocTypeBadge type={t.docType} />
                </div>
                <h3 className="text-sm font-semibold leading-snug">{t.title}</h3>
                {t.notes && <p className="line-clamp-2 text-xs text-muted-foreground">{t.notes}</p>}
                <div className="flex items-center justify-between gap-2">
                  <StatusSelect task={t} />
                  <PriorityBadge priority={t.priority} />
                </div>
                <div className="flex items-center justify-between gap-2 border-t border-border pt-2">
                  <div className="flex items-center gap-2"><GedeLink url={t.gedeUrl} /><DueDate task={t} /></div>
                  <Avatars ids={t.assignees} />
                </div>
              </article>
            ))}
            {c.items.length === 0 && <p className="py-8 text-center text-xs text-muted-foreground">Arraste documentos para cá</p>}
          </div>
        </section>
      ))}
    </div>
  );
}
