import { useState } from "react";
import { CalendarDays, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { STATUSES, STATUS_STYLE, fmtDate, useTasks, type Status, type Task } from "@/lib/tasks";
import { Avatars, DocTypeBadge, GedeLink, PriorityBadge } from "./Shared";

export function KanbanView({ onEdit, onNew }: { onEdit: (t: Task) => void; onNew: (s: Status) => void }) {
  const { filtered, companyOf, moveTask } = useTasks();
  const [over, setOver] = useState<Status | null>(null);

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
      {STATUSES.map((s) => {
        const items = filtered.filter((t) => t.status === s);
        return (
          <section key={s}
            onDragOver={(e) => { e.preventDefault(); setOver(s); }}
            onDragLeave={() => setOver(null)}
            onDrop={(e) => { e.preventDefault(); const id = e.dataTransfer.getData("text/plain"); if (id) moveTask(id, s); setOver(null); }}
            className={cn("flex min-h-[60vh] flex-col rounded-xl border border-border bg-muted/60 p-3 transition-colors", over === s && "border-primary bg-accent")}>
            <header className="mb-3 flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", STATUS_STYLE[s].dot)} />
                <h2 className="truncate font-semibold">{s}</h2>
                <span className="rounded-full bg-card px-2 text-xs text-muted-foreground">{items.length}</span>
              </div>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onNew(s)} aria-label={`Novo documento em ${s}`}><Plus className="h-4 w-4" /></Button>
            </header>
            <div className="flex flex-1 flex-col gap-2.5">
              {items.map((t) => (
                <article key={t.id} draggable onDragStart={(e) => e.dataTransfer.setData("text/plain", t.id)} onClick={() => onEdit(t)}
                  className={cn("cursor-grab space-y-2 rounded-lg border border-border border-l-4 bg-card p-3 shadow-card transition hover:shadow-card-hover active:cursor-grabbing", STATUS_STYLE[s].border)}>
                  <div className="flex items-center justify-between gap-2">
                    <DocTypeBadge type={t.docType} />
                    <PriorityBadge priority={t.priority} />
                  </div>
                  <p className="truncate text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{companyOf(t.projectCode)?.name} › {t.projectCode}</p>
                  <h3 className="text-sm font-semibold leading-snug">{t.title}</h3>
                  {t.notes && <p className="line-clamp-2 text-xs text-muted-foreground">{t.notes}</p>}
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <div className="flex items-center gap-2">
                      <GedeLink url={t.gedeUrl} />
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><CalendarDays className="h-3 w-3" />{fmtDate(t.dueDate)}</span>
                    </div>
                    <Avatars ids={t.assignees} />
                  </div>
                </article>
              ))}
              {items.length === 0 && <p className="py-8 text-center text-xs text-muted-foreground">Arraste documentos para cá</p>}
            </div>
          </section>
        );
      })}
    </div>
  );
}
