import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { PEOPLE, PRIORITIES, STATUSES, initials, useTasks, type Status, type Task } from "@/lib/tasks";

const schema = z.object({
  title: z.string().trim().min(1, "Informe o título").max(150),
  projectCode: z.string().trim().min(1, "Selecione um projeto"),
  gedeUrl: z.string().trim().url("Link GEDE inválido").max(500).or(z.literal("")),
  assignees: z.array(z.string()).min(1, "Selecione ao menos um responsável"),
  dueDate: z.string().min(1, "Informe o prazo"),
  notes: z.string().max(2000),
});

const NEW = "__new__";

export function TaskDialog({ open, onOpenChange, task, defaultStatus }: { open: boolean; onOpenChange: (o: boolean) => void; task?: Task | null; defaultStatus?: Status }) {
  const { projects, upsertTask, addProject, deleteTask } = useTasks();
  const blank = (): Task => ({ id: "", title: "", projectCode: projects[0]?.code ?? "", gedeUrl: "", assignees: [], dueDate: "", status: defaultStatus ?? "Elaboração", priority: "Média", notes: "" });
  const [form, setForm] = useState<Task>(blank);
  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");

  useEffect(() => {
    if (open) { setForm(task ?? blank()); setNewCode(""); setNewName(""); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, task, defaultStatus]);

  const set = <K extends keyof Task>(k: K, v: Task[K]) => setForm((f) => ({ ...f, [k]: v }));

  const save = () => {
    let code = form.projectCode;
    if (code === NEW) {
      const c = newCode.trim().toUpperCase(); const n = newName.trim();
      if (!c || !n || c.length > 30 || n.length > 100) { toast.error("Informe código e nome do novo projeto"); return; }
      addProject({ code: c, name: n }); code = c;
    }
    const r = schema.safeParse({ ...form, projectCode: code });
    if (!r.success) { toast.error(r.error.issues[0]?.message ?? "Dados inválidos"); return; }
    upsertTask({ ...form, ...r.data, projectCode: code, id: form.id || `t${Date.now()}` });
    toast.success(form.id ? "Tarefa atualizada" : "Tarefa criada");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader><DialogTitle>{form.id ? "Editar tarefa" : "Nova tarefa"}</DialogTitle></DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2 space-y-1.5"><Label>Título</Label><Input value={form.title} onChange={(e) => set("title", e.target.value)} maxLength={150} /></div>
          <div className="space-y-1.5">
            <Label>Projeto</Label>
            <Select value={form.projectCode} onValueChange={(v) => set("projectCode", v)}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {projects.map((p) => <SelectItem key={p.code} value={p.code}>{p.code} · {p.name}</SelectItem>)}
                <SelectItem value={NEW}>+ Criar novo projeto</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>Prazo</Label><Input type="date" value={form.dueDate} onChange={(e) => set("dueDate", e.target.value)} /></div>
          {form.projectCode === NEW && (
            <>
              <div className="space-y-1.5"><Label>Código do projeto</Label><Input placeholder="PRJ-2026-04" value={newCode} onChange={(e) => setNewCode(e.target.value)} /></div>
              <div className="space-y-1.5"><Label>Nome do projeto</Label><Input value={newName} onChange={(e) => setNewName(e.target.value)} /></div>
            </>
          )}
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => set("status", v as Status)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Prioridade</Label>
            <Select value={form.priority} onValueChange={(v) => set("priority", v as Task["priority"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{PRIORITIES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2 space-y-1.5"><Label>Link GED/GEDE</Label><Input type="url" placeholder="https://..." value={form.gedeUrl} onChange={(e) => set("gedeUrl", e.target.value)} /></div>
          <div className="sm:col-span-2 space-y-1.5">
            <Label>Responsáveis</Label>
            <div className="grid gap-2 rounded-md border border-border p-3 sm:grid-cols-2">
              {PEOPLE.map((p) => (
                <label key={p.id} className="flex cursor-pointer items-center gap-2 text-sm">
                  <Checkbox checked={form.assignees.includes(p.id)} onCheckedChange={(c) => set("assignees", c ? [...form.assignees, p.id] : form.assignees.filter((x) => x !== p.id))} />
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">{initials(p.name)}</span>
                  <span className="min-w-0 truncate">{p.name}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="sm:col-span-2 space-y-1.5"><Label>Observações</Label><Textarea rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)} maxLength={2000} /></div>
        </div>
        <DialogFooter className="gap-2">
          {form.id && <Button variant="outline" className="mr-auto text-destructive" onClick={() => { deleteTask(form.id); onOpenChange(false); toast.success("Tarefa excluída"); }}>Excluir</Button>}
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={save}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
