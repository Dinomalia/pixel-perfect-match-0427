import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { docLabel, personById, revOf, useTasks, type Task } from "@/lib/tasks";
import { DocTypeBadge, FolderCopy, GedeLink, StatusBadge } from "./Shared";

export function TaskViewDialog({ task, onClose, onEdit }: { task: Task | null; onClose: () => void; onEdit: (t: Task) => void }) {
  const { companyOf, projects } = useTasks();
  if (!task) return null;
  const project = projects.find((p) => p.code === task.projectCode);
  const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="grid grid-cols-[120px_1fr] items-start gap-3 py-2 border-b border-border last:border-0">
      <span className="text-xs font-medium uppercase text-muted-foreground">{label}</span>
      <div className="min-w-0 text-sm">{children}</div>
    </div>
  );
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader className="flex-row items-center justify-between gap-2 space-y-0 pr-8">
          <DialogTitle className="truncate">{task.title} — Rev. {revOf(task)}</DialogTitle>
          <Button size="sm" variant="outline" onClick={() => { onClose(); onEdit(task); }}><Pencil className="h-3.5 w-3.5" />Editar</Button>
        </DialogHeader>
        <div>
          <Row label="Cliente">{companyOf(task.projectCode)?.name ?? "—"}</Row>
          <Row label="Projeto">{task.projectCode}{project ? ` · ${project.name}` : ""}</Row>
          <Row label="Disciplina"><span className="inline-flex items-center gap-2"><DocTypeBadge type={task.docType} />{docLabel(task.docType)}</span></Row>
          <Row label="Status"><StatusBadge status={task.status} /></Row>
          <Row label="Responsáveis">{task.assignees.map((a) => personById(a)?.name).filter(Boolean).join(", ") || "—"}</Row>
          <Row label="GEDE">{task.gedeUrl ? <span className="flex items-center gap-2"><GedeLink url={task.gedeUrl} /><span className="break-all text-xs text-muted-foreground">{task.gedeUrl}</span></span> : "—"}</Row>
          <Row label="Caminho">{task.folderPath ? <span className="flex items-center gap-2"><FolderCopy path={task.folderPath} /><code className="break-all text-xs">{task.folderPath}</code></span> : "—"}</Row>
        </div>
      </DialogContent>
    </Dialog>
  );
}
