import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { toastDeleted } from "./Trash";
import { Copy } from "lucide-react";
import { copyPath } from "./Shared";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { PRIORITIES, docLabel, initials, isNetPath, useTasks, type Status, type Task } from "@/lib/tasks";

const schema = z.object({
  title: z.string().trim().min(1, "Informe o título").max(150),
  docType: z.string().trim().min(1, "Selecione o tipo de documento").max(10, "Tipo com até 10 caracteres"),
  gedeUrl: z.string().trim().max(500).refine((v) => !v || isNetPath(v) || /^https?:\/\//i.test(v), "Link GED inválido (use http(s):// ou caminho de rede)"),
  assignees: z.array(z.string()).min(1, "Selecione ao menos um responsável"),
  dueDate: z.string().min(1, "Informe o prazo"),
  notes: z.string().max(2000),
});

const NEW = "__new__";
const NONE = "__none__";

export function TaskDialog({ open, onOpenChange, task, defaultStatus }: { open: boolean; onOpenChange: (o: boolean) => void; task?: Task | null; defaultStatus?: Status }) {
  const { people, projects, parentProjects, projectPhases, stages, companies, docTypes, addDocType, upsertTask, addProject, addPhase, renamePhase, addCompany, deleteTask, undo, companyOf, filters } = useTasks();
  const blank = (): Task => ({
    id: "", title: "", projectCode: "", phaseId: "", docType: "", gedeUrl: "", assignees: [],
    dueDate: "", status: defaultStatus ?? (stages[0]?.name ?? "Elaboração"), priority: "Média", notes: "", sandechCode: "", clientCode: "",
  });
  const [form, setForm] = useState<Task>(blank);
  const [companyId, setCompanyId] = useState("");
  const [newCompany, setNewCompany] = useState("");
  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [newPhaseName, setNewPhaseName] = useState("");
  const [editingPhaseName, setEditingPhaseName] = useState("");
  const [renamingPhase, setRenamingPhase] = useState(false);
  const [customType, setCustomType] = useState("");
  const [customTypeName, setCustomTypeName] = useState("");

  useEffect(() => {
    if (!open) return;
    const f = task ? { ...task } : blank();
    const cid = task ? companyOf(task.projectCode)?.id ?? "" : filters.company !== "all" ? filters.company : companies[0]?.id ?? "";
    if (!task) {
      const proj = filters.project !== "all" ? filters.project : projects.find((p) => p.companyId === cid)?.code ?? "";
      f.projectCode = proj;
      if (filters.phase !== "all") f.phaseId = filters.phase;
    }
    setForm(f); setCompanyId(cid); setNewCompany(""); setNewCode(""); setNewName(""); setNewPhaseName(""); setRenamingPhase(false); setEditingPhaseName(""); setCustomType(""); setCustomTypeName("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, task, defaultStatus]);

  const set = <K extends keyof Task>(k: K, v: Task[K]) => setForm((f) => ({ ...f, [k]: v }));
  const companyProjects = projects.filter((p) => p.companyId === companyId);
  const selectedParent = parentProjects.find((pp) => pp.code === form.projectCode);
  const availablePhases = selectedParent ? projectPhases.filter((ph) => ph.parentProjectId === selectedParent.id) : [];

  const save = () => {
    let cid = companyId;
    if (cid === NEW) {
      const n = newCompany.trim();
      if (!n || n.length > 80) { toast.error("Informe o nome da nova empresa"); return; }
      cid = addCompany(n);
    }
    if (!cid) { toast.error("Selecione a empresa"); return; }
    let code = form.projectCode;
    if (code === NEW || cid !== companyId) {
      const c = newCode.trim().toUpperCase(); const n = newName.trim();
      if (!c || !n || c.length > 30 || n.length > 100) { toast.error("Informe código e nome do novo projeto"); return; }
      addProject({ code: c, name: n, companyId: cid }); code = c;
    }
    if (!code) { toast.error("Selecione o projeto"); return; }

    let phaseId = form.phaseId && form.phaseId !== NONE ? form.phaseId : undefined;
    if (form.phaseId === NEW) {
      const pp = parentProjects.find((x) => x.code === code);
      const pn = newPhaseName.trim() || `Fase ${availablePhases.length + 1}`;
      if (pp) phaseId = addPhase(pp.id, pn).id;
    } else if (renamingPhase && phaseId && editingPhaseName.trim()) {
      renamePhase(phaseId, editingPhaseName.trim());
    }

    const isNewType = form.docType === NEW;
    const docType = isNewType ? customType.trim().toUpperCase() : form.docType;
    if (isNewType && !customTypeName.trim()) { toast.error("Informe o nome do novo tipo"); return; }
    const r = schema.safeParse({ ...form, docType });
    if (!r.success) { toast.error(r.error.issues[0]?.message ?? "Dados inválidos"); return; }
    if (isNewType) addDocType(docType, customTypeName);
    upsertTask({
      ...form,
      ...r.data,
      projectCode: code,
      phaseId,
      sandechCode: form.sandechCode?.trim() || undefined,
      clientCode: form.clientCode?.trim() || undefined,
      id: form.id || `t${Date.now()}`,
    });
    toast.success(form.id ? "Documento atualizado" : "Documento criado");
    onOpenChange(false);
  };

  const showNewProject = form.projectCode === NEW || companyId === NEW;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader><DialogTitle>{form.id ? "Editar documento" : "Novo documento"}</DialogTitle></DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>1. Empresa / Cliente</Label>
            <Select value={companyId} onValueChange={(v) => { setCompanyId(v); set("projectCode", projects.find((p) => p.companyId === v)?.code ?? (v === NEW ? NEW : "")); set("phaseId", ""); }}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                <SelectItem value={NEW}>+ Nova empresa</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>2. Projeto Mãe</Label>
            <Select value={companyId === NEW ? NEW : form.projectCode} onValueChange={(v) => { set("projectCode", v); set("phaseId", ""); setRenamingPhase(false); }} disabled={companyId === NEW}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {companyProjects.map((p) => <SelectItem key={p.code} value={p.code}>{p.code} · {p.name}</SelectItem>)}
                <SelectItem value={NEW}>+ Novo projeto</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {companyId === NEW && <div className="sm:col-span-2 space-y-1.5"><Label>Nome da nova empresa</Label><Input value={newCompany} onChange={(e) => setNewCompany(e.target.value)} maxLength={80} /></div>}
          {showNewProject && (
            <>
              <div className="space-y-1.5"><Label>Código do projeto</Label><Input placeholder="PRJ-1600" value={newCode} onChange={(e) => setNewCode(e.target.value)} maxLength={30} /></div>
              <div className="space-y-1.5"><Label>Nome do projeto</Label><Input value={newName} onChange={(e) => setNewName(e.target.value)} maxLength={100} /></div>
            </>
          )}
          <div className="sm:col-span-2 space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>Fase / Parte do Projeto (opcional)</Label>
              {form.phaseId && form.phaseId !== NEW && form.phaseId !== NONE && (
                <button
                  type="button"
                  className="text-xs text-primary hover:underline"
                  onClick={() => {
                    const cur = availablePhases.find((p) => p.id === form.phaseId);
                    setEditingPhaseName(cur?.name ?? "");
                    setRenamingPhase((r) => !r);
                  }}
                >
                  {renamingPhase ? "Cancelar renomeação" : "Renomear fase selecionada"}
                </button>
              )}
            </div>
            <Select value={form.phaseId || NONE} onValueChange={(v) => { set("phaseId", v === NONE ? "" : v); setRenamingPhase(false); }} disabled={showNewProject}>
              <SelectTrigger><SelectValue placeholder="Selecione a fase" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Sem fase definida</SelectItem>
                {availablePhases.map((ph) => <SelectItem key={ph.id} value={ph.id}>{ph.name}</SelectItem>)}
                <SelectItem value={NEW}>+ Nova fase (ex: Projeto Básico, FEED)</SelectItem>
              </SelectContent>
            </Select>
            {form.phaseId === NEW && (
              <Input placeholder="Nome da nova fase (opcional, ex: Projeto Detalhado)" value={newPhaseName} onChange={(e) => setNewPhaseName(e.target.value)} maxLength={80} />
            )}
            {renamingPhase && form.phaseId && form.phaseId !== NEW && (
              <Input placeholder="Novo nome da fase" value={editingPhaseName} onChange={(e) => setEditingPhaseName(e.target.value)} maxLength={80} />
            )}
          </div>
          <div className="space-y-1.5">
            <Label>3. Tipo de documento</Label>
            <Select value={form.docType} onValueChange={(v) => set("docType", v)}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {docTypes.map((d) => <SelectItem key={d} value={d}>{d} — {docLabel(d)}</SelectItem>)}
                <SelectItem value={NEW}>+ Tipo customizado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {form.docType === NEW ? (
            <>
              <div className="space-y-1.5"><Label>Sigla do novo tipo</Label><Input placeholder="ex.: ADF" value={customType} onChange={(e) => setCustomType(e.target.value)} maxLength={10} /></div>
              <div className="sm:col-span-2 space-y-1.5"><Label>Nome do novo tipo</Label><Input placeholder="ex.: Análise de Falhas" value={customTypeName} onChange={(e) => setCustomTypeName(e.target.value)} maxLength={60} /></div>
            </>
          ) : (
            <div className="space-y-1.5"><Label>Prazo</Label><Input type="date" value={form.dueDate} onChange={(e) => set("dueDate", e.target.value)} /></div>
          )}
          <div className="sm:col-span-2 space-y-1.5"><Label>Título do documento</Label><Input value={form.title} onChange={(e) => set("title", e.target.value)} maxLength={150} /></div>
          {form.docType === NEW && <div className="space-y-1.5"><Label>Prazo</Label><Input type="date" value={form.dueDate} onChange={(e) => set("dueDate", e.target.value)} /></div>}
          <div className="space-y-1.5"><Label>Código SANDECH</Label><Input placeholder="ex.: SND-1420-MD-001" value={form.sandechCode ?? ""} onChange={(e) => set("sandechCode", e.target.value)} maxLength={60} /></div>
          <div className="space-y-1.5"><Label>Código Cliente</Label><Input placeholder="ex.: CLI-MD-101" value={form.clientCode ?? ""} onChange={(e) => set("clientCode", e.target.value)} maxLength={60} /></div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => set("status", v as Status)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{stages.map((s) => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Prioridade</Label>
            <Select value={form.priority} onValueChange={(v) => set("priority", v as Task["priority"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{PRIORITIES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2 space-y-1.5"><Label>Link GED</Label><Input placeholder="https://... ou \\servidor\..." value={form.gedeUrl} onChange={(e) => set("gedeUrl", e.target.value)} /></div>
          <div className="sm:col-span-2 space-y-1.5"><Label>Caminho da pasta (rede)</Label><div className="flex gap-2"><Input className="font-mono text-xs" placeholder="\\servidor\projetos\..." value={form.folderPath ?? ""} onChange={(e) => set("folderPath", e.target.value)} /><Button type="button" variant="outline" size="icon" aria-label="Copiar caminho" disabled={!(form.folderPath || (isNetPath(form.gedeUrl) && form.gedeUrl))} onClick={() => copyPath(form.folderPath || form.gedeUrl)}><Copy className="h-4 w-4" /></Button></div></div>
          <div className="sm:col-span-2 space-y-1.5">
            <Label>Colaboradores</Label>
            <div className="grid gap-2 rounded-md border border-border p-3 sm:grid-cols-2">
              {people.map((p) => (
                <label key={p.id} className="flex cursor-pointer items-center gap-2 text-sm">
                  <Checkbox checked={form.assignees.includes(p.id)} onCheckedChange={(c) => set("assignees", c ? [...form.assignees, p.id] : form.assignees.filter((x) => x !== p.id))} />
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">{initials(p.name)}</span>
                  <span className="min-w-0 truncate">{p.name}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="sm:col-span-2 grid gap-3 rounded-md border border-status-rework/40 bg-status-rework/5 p-3 sm:grid-cols-[180px_1fr]">
            <div className="space-y-1.5"><Label>Retrabalho Qualidade (ocorrências)</Label><Input type="number" min={0} max={99} value={form.qualityRework ?? 0} onChange={(e) => set("qualityRework", Math.max(0, Math.min(99, Number(e.target.value) || 0)))} /></div>
            <div className="space-y-1.5"><Label>Motivos</Label><Input value={form.qualityReworkNote ?? ""} onChange={(e) => set("qualityReworkNote", e.target.value)} maxLength={300} placeholder="Ex.: inconsistência de tag, norma não atendida" /></div>
          </div>
          <div className="sm:col-span-2 space-y-1.5"><Label>Descrição / Observações</Label><Textarea rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)} maxLength={2000} /></div>
        </div>
        <DialogFooter className="gap-2">
          {form.id && <Button variant="outline" className="mr-auto text-destructive" onClick={() => { deleteTask(form.id); onOpenChange(false); toastDeleted("Documento movido para a Lixeira", undo); }}>Excluir</Button>}
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={save}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
