import { Building2, Copy, FileText, FolderOpen, Hash, Layers, Link2, NotebookPen, Pencil, Tag, Users, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { docLabel, getStageColor, getStatusStyle, initials, personById, revOf, STATUS_STYLE, useTasks, type Task } from "@/lib/tasks";
import { cn } from "@/lib/utils";
import { ChecklistEditor } from "./Checklist";
import { copyPath, DocTypeBadge, FolderCopy, GedeLink, StatusBadge } from "./Shared";

function Row({ icon: Icon, label, children }: { icon: typeof Tag; label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[140px_1fr] items-center gap-3 py-2.5">
      <span className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground"><Icon className="h-3.5 w-3.5" />{label}</span>
      <div className="min-w-0 text-sm">{children}</div>
    </div>
  );
}

function CopyableCode({ value, label }: { value?: string | undefined; label: string }) {
  if (!value?.trim()) return <span className="text-muted-foreground">—</span>;
  return (
    <span className="inline-flex items-center gap-2">
      <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs font-semibold text-foreground">{value}</code>
      <button
        type="button"
        onClick={() => copyPath(value, `${label} copiado!`)}
        title={`Copiar ${label}`}
        aria-label={`Copiar ${label}`}
        className="inline-flex items-center gap-1 rounded border border-border px-1.5 py-0.5 text-[11px] text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        <Copy className="h-3 w-3" />Copiar
      </button>
    </span>
  );
}

export function TaskViewDialog({ task: initial, onClose, onEdit }: { task: Task | null; onClose: () => void; onEdit: (t: Task) => void }) {
  const { companyOf, projects, tasks, phaseOf, stages } = useTasks();
  if (!initial) return null;
  const task = tasks.find((x) => x.id === initial.id) ?? initial;
  const project = projects.find((p) => p.code === task.projectCode);
  const phase = phaseOf(task.phaseId);
  const people = task.assignees.map((a) => personById(a)).filter((p) => !!p);
  const st = getStatusStyle(task.status, stages);
  const customColor = !STATUS_STYLE[task.status] ? getStageColor(task.status, stages) : undefined;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent onClick={(e) => e.stopPropagation()} className="max-h-[90vh] gap-0 overflow-hidden p-0 sm:max-w-xl">
        <div className={cn("h-1.5 w-full", !customColor && st.dot)} style={customColor ? { backgroundColor: customColor } : undefined} />
        <div className="max-h-[calc(90vh-6px)] space-y-5 overflow-y-auto p-6">
          <DialogHeader className="space-y-1.5 pr-8 text-left">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {companyOf(task.projectCode)?.name} • {task.projectCode}{phase ? ` • ${phase.name}` : ""}
            </p>
            <div className="flex items-start justify-between gap-3">
              <DialogTitle className="text-lg leading-snug">{task.title}</DialogTitle>
              <Button size="sm" variant="outline" className="shrink-0" onClick={() => { onClose(); onEdit(task); }}><Pencil className="h-3.5 w-3.5" />Editar</Button>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="rounded bg-primary px-1.5 py-0.5 text-[11px] font-bold text-primary-foreground">Rev. {revOf(task)}</span>
              <DocTypeBadge type={task.docType} />
              <StatusBadge status={task.status} />
            </div>
          </DialogHeader>
          <div className="divide-y divide-border rounded-lg border border-border px-4">
            <Row icon={Building2} label="Cliente">{companyOf(task.projectCode)?.name ?? "—"}</Row>
            <Row icon={Briefcase} label="Projeto">{task.projectCode}{project ? ` · ${project.name}` : ""}</Row>
            {phase && <Row icon={Layers} label="Fase">{phase.name}</Row>}
            <Row icon={FileText} label="Disciplina"><span className="inline-flex items-center gap-2"><DocTypeBadge type={task.docType} />{docLabel(task.docType)}</span></Row>
            <Row icon={Hash} label="Código SANDECH"><CopyableCode value={task.sandechCode} label="Código SANDECH" /></Row>
            <Row icon={Hash} label="Código Cliente"><CopyableCode value={task.clientCode} label="Código Cliente" /></Row>
            <Row icon={Users} label="Responsáveis">{people.length ? <span className="flex flex-wrap gap-2">{people.map((p) => <span key={p.id} className="inline-flex items-center gap-1.5"><span className="grid h-6 w-6 place-items-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">{initials(p.name)}</span>{p.name}</span>)}</span> : "—"}</Row>
            <Row icon={Link2} label="GED">{task.gedeUrl ? <span className="flex items-center gap-2"><GedeLink url={task.gedeUrl} /><span className="break-all text-xs text-muted-foreground">{task.gedeUrl}</span></span> : "—"}</Row>
            <Row icon={FolderOpen} label="Caminho">{task.folderPath ? <span className="flex items-center gap-2"><FolderCopy path={task.folderPath} /><code className="break-all text-xs">{task.folderPath}</code></span> : "—"}</Row>
          </div>
          <section className="space-y-2">
            <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><NotebookPen className="h-3.5 w-3.5" />Descrição / Observações</h3>
            <div className="whitespace-pre-wrap rounded-lg border border-border bg-muted/50 p-3 text-sm">{task.notes?.trim() ? task.notes : <span className="text-muted-foreground">Sem descrição.</span>}</div>
          </section>
          <div className="border-t border-border pt-4"><ChecklistEditor task={task} /></div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
