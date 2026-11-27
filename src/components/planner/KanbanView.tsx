import { useState } from "react";
import { Layers, Plus, ShieldAlert, Trash2 } from "lucide-react";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from "@/components/ui/context-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PEOPLE, STATUS_STYLE, getStageColor, getStatusStyle, initials, revOf, useTasks, type Status, type Task } from "@/lib/tasks";
import { CardChecklist } from "./Checklist";
import { Avatars, DocTypeBadge, DueDate, FolderCopy, GedeLink, PriorityBadge, StatusSelect } from "./Shared";
import { TaskViewDialog } from "./TaskViewDialog";
import { NewRevisionDialog, RevisionSelect, confirmDeleteRevision } from "./Revisions";

export type GroupBy = "status" | "person" | "project";
type Col = { key: string; title: string; sub?: string | undefined; dot?: string | undefined; color?: string | undefined; avatar?: string | undefined; items: Task[] };

export function KanbanView({ groupBy, onEdit, onNew }: { groupBy: GroupBy; onEdit: (t: Task) => void; onNew: (s: Status) => void }) {
  const { filtered, companyOf, moveTask, upsertTask, projects, stages, swapRevision, deleteRevision, toggleQualityRework } = useTasks();
  const [over, setOver] = useState<string | null>(null);
  const [revTask, setRevTask] = useState<Task | null>(null);
  const [viewTask, setViewTask] = useState<Task | null>(null);

  let cols: Col[];
  if (groupBy === "status") {
    cols = stages.map((s) => {
      const st = getStatusStyle(s.name, stages);
      const custom = !STATUS_STYLE[s.name] ? s.color : undefined;
      return { key: s.name, title: s.name, dot: custom ? undefined : st.dot, color: custom, items: filtered.filter((t) => t.status === s.name) };
    });
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
    <div className="kanban-scroll flex h-[calc(100vh-240px)] min-h-[480px] gap-4 overflow-x-auto overflow-y-hidden pb-2">
      {cols.map((c) => (
        <section key={c.key}
          onDragOver={(e) => { e.preventDefault(); setOver(c.key); }}
          onDragLeave={() => setOver(null)}
          onDrop={(e) => { e.preventDefault(); const id = e.dataTransfer.getData("text/plain"); if (id) drop(id, c.key); setOver(null); }}
          className={cn("flex h-full w-[300px] shrink-0 flex-col rounded-xl border border-border bg-muted/60 p-3 transition-colors", over === c.key && "border-primary bg-accent")}>
          <header className="mb-3 flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              {(c.dot || c.color) && <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", c.dot)} style={c.color ? { backgroundColor: c.color } : undefined} />}
              {c.avatar && <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">{c.avatar}</span>}
              <div className="min-w-0">
                <h2 className="truncate font-semibold leading-tight">{c.title}</h2>
                {c.sub && <p className="truncate text-xs text-muted-foreground">{c.sub}</p>}
              </div>
              <span className="rounded-full bg-card px-2 text-xs text-muted-foreground">{c.items.length}</span>
            </div>
            {groupBy === "status" && <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onNew(c.key as Status)} aria-label={`Novo documento em ${c.title}`}><Plus className="h-4 w-4" /></Button>}
          </header>
          <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto">
            {c.items.map((t) => {
              const hist = t.history ?? [];
              const n = hist.length;
              const back = hist[n - 1];
              const layers = hist.slice(-2);
              const qr = !!t.qualityRework;
              const cardStyle = getStatusStyle(t.status, stages);
              const customBorder = !STATUS_STYLE[t.status] ? getStageColor(t.status, stages) : undefined;
              return (
               <div key={t.id} data-task-id={t.id} className={cn("relative isolate", layers.length === 2 ? "pt-20" : layers.length === 1 ? "pt-10" : "pt-0")}>
                 {layers.map((layer, index) => (
                   <Button key={layer.rev} type="button" variant="ghost" title={`Trazer a Rev. ${layer.rev} para frente`} aria-label={`Trazer a Rev. ${layer.rev} de ${t.title} para frente`} onClick={(e) => { e.stopPropagation(); swapRevision(t.id, layer.rev); }}
                     className={cn("absolute left-0 right-0 flex h-10 w-full items-start justify-start overflow-hidden rounded-t-lg rounded-b-none border border-border border-l-4 bg-card px-3 pt-2.5 pb-0 text-left shadow-card hover:bg-accent", index === 0 ? "top-0 z-[1]" : "top-10 z-[2]", getStatusStyle(layer.status, stages).border)}>
                     <div className="flex h-5 w-full items-center justify-between gap-1">
                       <p className="min-w-0 truncate text-[11px] font-medium uppercase text-muted-foreground" title={`${companyOf(layer.projectCode ?? t.projectCode)?.name} • ${layer.projectCode ?? t.projectCode}`}>{companyOf(layer.projectCode ?? t.projectCode)?.name} • {layer.projectCode ?? t.projectCode}</p>
                      <div className="flex items-center gap-1">
                         <span className="shrink-0 rounded bg-primary px-1.5 py-0.5 text-[11px] font-bold text-primary-foreground">Rev. {layer.rev}</span>
                         {layer.folderPath && <FolderCopy path={layer.folderPath} />}
                         <DocTypeBadge type={layer.docType ?? t.docType} />
                      </div>
                    </div>
                   </Button>
                 ))}
              <ContextMenu>
              <ContextMenuTrigger asChild>
              <article
                draggable
                onDragStart={(e) => e.dataTransfer.setData("text/plain", t.id)}
                onClick={() => { if (!revTask) setViewTask(t); }}
                style={customBorder ? { borderLeftColor: customBorder } : undefined}
                className={cn("relative z-10 cursor-grab space-y-2 rounded-lg border border-border border-l-4 bg-card p-3 shadow-card transition hover:shadow-card-hover active:cursor-grabbing", cardStyle.border)}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{companyOf(t.projectCode)?.name} • {t.projectCode}</p>
                  <div className="flex items-center gap-1">
                    <span className="rounded bg-primary px-1.5 py-0.5 text-[11px] font-bold text-primary-foreground">Rev. {revOf(t)}</span>
                    <DocTypeBadge type={t.docType} />
                  </div>
                </div>
                {t.sandechCode && (
                  <p className="truncate font-mono text-[10px] font-medium text-muted-foreground">{t.sandechCode}</p>
                )}
                <h3 className="text-sm font-semibold leading-snug">{t.title}</h3>
                {qr && <span className="inline-flex items-center gap-1 rounded-md border border-status-rework/50 bg-status-rework/15 px-2 py-0.5 text-[11px] font-semibold text-status-rework"><ShieldAlert className="h-3 w-3" />Retrabalho Qualidade</span>}
                {t.notes && <p className="line-clamp-2 text-xs text-muted-foreground">{t.notes}</p>}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <StatusSelect task={t} />
                    <RevisionSelect task={t} />
                  </div>
                  <PriorityBadge priority={t.priority} />
                </div>
                <CardChecklist task={t} />
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2">
                  <div className="flex items-center gap-1.5"><GedeLink url={t.gedeUrl} /><FolderCopy path={t.folderPath} /><DueDate task={t} /></div>
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="ghost" className={cn("h-7 w-7", qr && "bg-status-rework/15 text-status-rework")} title={qr ? "Remover Retrabalho Qualidade" : "Registrar Retrabalho Qualidade"} aria-label="Registrar Retrabalho Qualidade" aria-pressed={qr} onClick={(e) => { e.stopPropagation(); toggleQualityRework(t.id); }}><ShieldAlert className="h-3.5 w-3.5" /></Button>
                    <Button size="sm" variant="ghost" className="h-7 gap-1 px-2 text-xs" onClick={(e) => { e.stopPropagation(); setViewTask(null); setRevTask(t); }}><Layers className="h-3 w-3" />Nova Rev</Button>
                    <Avatars ids={t.assignees} />
                  </div>
                </div>
                 {back && <Button type="button" variant="link" onClick={(e) => { e.stopPropagation(); swapRevision(t.id, back.rev); }} className="h-auto p-0 text-[11px] text-muted-foreground underline-offset-2 hover:text-primary hover:underline">🗂 {n} revis{n === 1 ? "ão anterior" : "ões anteriores"}</Button>}
              </article>
              </ContextMenuTrigger>
              <ContextMenuContent>
                <ContextMenuItem onSelect={() => toggleQualityRework(t.id)}><ShieldAlert className="mr-2 h-3.5 w-3.5" />{qr ? "Remover Retrabalho Qualidade" : "Registrar Retrabalho Qualidade"}</ContextMenuItem>
                <ContextMenuItem onSelect={() => { setViewTask(null); setRevTask(t); }}><Layers className="mr-2 h-3.5 w-3.5" />Nova Rev</ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem className="text-destructive focus:text-destructive" onSelect={() => confirmDeleteRevision(t, null, deleteRevision)}><Trash2 className="mr-2 h-3.5 w-3.5" />Excluir esta revisão</ContextMenuItem>
              </ContextMenuContent>
              </ContextMenu>
              </div>
            ); })}
            {c.items.length === 0 && <p className="py-8 text-center text-xs text-muted-foreground">Arraste documentos para cá</p>}
          </div>
        </section>
      ))}
      <TaskViewDialog task={revTask ? null : viewTask} onClose={() => setViewTask(null)} onEdit={onEdit} />
      <NewRevisionDialog task={revTask} onClose={() => setRevTask(null)} />
    </div>
  );
}
