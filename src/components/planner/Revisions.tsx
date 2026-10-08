import { useState } from "react";
import { ChevronDown, History, Layers } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { STATUS_STYLE, fmtDate, nextRev, personById, revOf, useTasks, type RevisionSnapshot, type Task } from "@/lib/tasks";
import { StatusBadge } from "./Shared";

export function RevisionSelect({ task, onView }: { task: Task; onView: (s: RevisionSnapshot) => void }) {
  const history = task.history ?? [];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
        <button type="button" className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary transition hover:opacity-80">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />Rev. {revOf(task)}<ChevronDown className="h-3 w-3" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent onClick={(e) => e.stopPropagation()} className="w-64">
        <DropdownMenuLabel className="text-xs">Revisões do documento</DropdownMenuLabel>
        <DropdownMenuItem className="gap-2">
          <span className={cn("h-2 w-2 rounded-full", STATUS_STYLE[task.status].dot)} />
          <span className="font-semibold">Rev. {revOf(task)}</span>
          <span className="ml-auto text-[11px] text-muted-foreground">atual · {task.status}</span>
        </DropdownMenuItem>
        {history.length > 0 && <DropdownMenuSeparator />}
        {[...history].reverse().map((h) => (
          <DropdownMenuItem key={h.rev + h.archivedAt} onSelect={() => onView(h)} className="gap-2">
            <span className={cn("h-2 w-2 rounded-full", STATUS_STYLE[h.status].dot)} />
            <span>Rev. {h.rev}</span>
            <span className="ml-auto text-[11px] text-muted-foreground">{fmtDate(h.archivedAt)} · {h.status}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function SnapshotDialog({ task, snap, onClose }: { task: Task | null; snap: RevisionSnapshot | null; onClose: () => void }) {
  return (
    <Dialog open={!!snap} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        {snap && task && (
          <>
            <DialogHeader><DialogTitle className="flex items-center gap-2"><History className="h-4 w-4" />{task.title} — Rev. {snap.rev}</DialogTitle></DialogHeader>
            <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">Somente leitura · revisão arquivada em {fmtDate(snap.archivedAt)}</p>
            <dl className="grid grid-cols-[120px_1fr] gap-y-2 text-sm">
              <dt className="text-muted-foreground">Status final</dt><dd><StatusBadge status={snap.status} /></dd>
              <dt className="text-muted-foreground">Responsáveis</dt><dd>{snap.assignees.map((a) => personById(a)?.name).join(", ") || "—"}</dd>
              <dt className="text-muted-foreground">Prazo</dt><dd>{fmtDate(snap.dueDate)}</dd>
              <dt className="text-muted-foreground">GEDE</dt><dd>{snap.gedeUrl ? <a className="text-primary underline" href={snap.gedeUrl} target="_blank" rel="noopener noreferrer">Abrir</a> : "—"}</dd>
              <dt className="text-muted-foreground">Nota</dt><dd>{snap.note || "—"}</dd>
            </dl>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function NewRevisionDialog({ task, onClose }: { task: Task | null; onClose: () => void }) {
  const { newRevision } = useTasks();
  const [rev, setRev] = useState("");
  const [gede, setGede] = useState("");
  const [due, setDue] = useState("");
  const [note, setNote] = useState("");
  const open = !!task;
  const init = (t: Task) => { setRev(nextRev(revOf(t))); setGede(t.gedeUrl); setDue(t.dueDate); setNote(""); };
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); else if (task) init(task); }}>
      <DialogContent onOpenAutoFocus={() => task && init(task)}>
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Layers className="h-4 w-4" />Nova Revisão</DialogTitle></DialogHeader>
        {task && <p className="text-sm text-muted-foreground">{task.title} · Rev. {revOf(task)} será arquivada e a nova começa em <b>Elaboração</b>.</p>}
        <div className="grid gap-3">
          <label className="grid gap-1 text-sm">Revisão<Input value={rev} onChange={(e) => setRev(e.target.value.toUpperCase())} /></label>
          <label className="grid gap-1 text-sm">Link GEDE<Input value={gede} onChange={(e) => setGede(e.target.value)} /></label>
          <label className="grid gap-1 text-sm">Prazo<Input type="date" value={due} onChange={(e) => setDue(e.target.value)} /></label>
          <label className="grid gap-1 text-sm">Motivo / nota<Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex.: atender comentários do cliente" /></label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button disabled={!rev.trim()} onClick={() => { if (task) newRevision(task.id, { rev: rev.trim(), status: "Elaboração", gedeUrl: gede, dueDate: due, note }); onClose(); }}>Criar Revisão</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
