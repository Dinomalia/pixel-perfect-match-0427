import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { Upload, CheckSquare, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTasks, type ChecklistItem, type Priority, type Task } from "@/lib/tasks";

type ParsedRow = {
  key: string;
  selected: boolean;
  plannerTaskId?: string | undefined;
  title: string;
  bucket: string;
  mappedStatus: string;
  isNewBucket: boolean;
  docType: string;
  sandechCode?: string | undefined;
  gedeUrl: string;
  folderPath?: string | undefined;
  startDate?: string | undefined;
  dueDate: string;
  assigneeNames: string[];
  priority: Priority;
  notes: string;
  checklist: ChecklistItem[];
  isDuplicate: boolean;
  existingId?: string | undefined;
};

function normalizeDate(val: unknown): string {
  if (!val) return "";
  if (typeof val === "number") {
    const d = XLSX.SSF.parse_date_code(val);
    if (d) return `${String(d.y).padStart(4, "0")}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
  }
  const s = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const br = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  return "";
}

function getCol(row: Record<string, unknown>, candidates: string[]): string {
  const keys = Object.keys(row);
  for (const c of candidates) {
    const found = keys.find((k) => k.trim().toLowerCase() === c.toLowerCase());
    if (found && row[found] != null) return String(row[found]).trim();
  }
  return "";
}

function getRawCol(row: Record<string, unknown>, candidates: string[]): unknown {
  const keys = Object.keys(row);
  for (const c of candidates) {
    const found = keys.find((k) => k.trim().toLowerCase() === c.toLowerCase());
    if (found && row[found] != null) return row[found];
  }
  return undefined;
}

export function ImportPlannerDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { companies, parentProjects, projectPhases, stages, people, tasks, addPerson, addStage, upsertManyTasks } = useTasks();

  const [companyId, setCompanyId] = useState(companies[0]?.id ?? "");
  const [projectCode, setProjectCode] = useState(parentProjects[0]?.code ?? "");
  const [phaseId, setPhaseId] = useState("");
  const [createNewBuckets, setCreateNewBuckets] = useState(true);
  const [duplicateMode, setDuplicateMode] = useState<"update" | "skip">("update");
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState("");

  const companyProjects = parentProjects.filter((p) => !companyId || p.companyId === companyId);
  const selectedParent = parentProjects.find((p) => p.code === projectCode);
  const availablePhases = selectedParent ? projectPhases.filter((ph) => ph.parentProjectId === selectedParent.id) : [];

  const handleFile = async (file: File) => {
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheetName = wb.SheetNames[0];
      if (!sheetName) { toast.error("Planilha vazia"); return; }
      const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[sheetName]!);
      if (!rawRows.length) { toast.error("Nenhuma tarefa encontrada na planilha"); return; }

      const parsed: ParsedRow[] = rawRows.map((r, idx) => {
        const rawTitle = getCol(r, ["Nome da tarefa", "Task Name", "Título", "Title"]);
        const bucket = getCol(r, ["Nome do bucket", "Bucket Name", "Bucket", "Etapa"]) || "Elaboração";
        const progress = getCol(r, ["Progresso", "Progress"]).toLowerCase();
        const assignedRaw = getCol(r, ["Atribuído a", "Assigned To"]);
        const startDate = normalizeDate(getRawCol(r, ["Data de início", "Start Date"]));
        const dueDate = normalizeDate(getRawCol(r, ["Data de conclusão", "Due Date", "Prazo"])) || new Date().toISOString().slice(0, 10);
        const labels = getCol(r, ["Rótulos", "Labels"]);
        const checklistRaw = getCol(r, ["Itens da lista de verificação", "Checklist Items"]);
        const desc = getCol(r, ["Descrição", "Description", "Notas", "Notes"]);
        const plannerTaskId = getCol(r, ["ID da tarefa", "Task ID", "ID"]) || undefined;

        const bracketMatch = rawTitle.match(/\[([A-Za-z0-9]{2,8})\]/);
        const docType = bracketMatch ? bracketMatch[1]!.toUpperCase() : "MD";
        const codeMatch = rawTitle.match(/\b([A-Z]{2,5}[-_][A-Z0-9]{2,6}(?:[-_][A-Z0-9]{1,8}){1,3})\b/);
        const sandechCode = codeMatch ? codeMatch[1] : undefined;

        const urlMatch = desc.match(/https?:\/\/[^\s]+/i);
        const netMatch = desc.match(/(?:[a-zA-Z]:\\[^\r\n]+|\\\\[^\s\r\n]+)/);

        const matchedStage = stages.find((s) => s.name.toLowerCase() === bucket.toLowerCase());
        const mappedStatus = progress.includes("conclu") || progress.includes("completed")
          ? "Aprovado"
          : matchedStage
            ? matchedStage.name
            : bucket;

        const checklist: ChecklistItem[] = checklistRaw
          ? checklistRaw.split(/[;\n]+/).map((x) => x.trim()).filter(Boolean).map((text, ci) => ({ id: `ck-${idx}-${ci}-${Date.now()}`, text, done: false }))
          : [];

        const assigneeNames = assignedRaw
          ? assignedRaw.split(/[;,]+/).map((s) => s.trim()).filter(Boolean)
          : [];

        const priority: Priority = labels.toLowerCase().includes("crític") || labels.toLowerCase().includes("urgent")
          ? "Crítica"
          : labels.toLowerCase().includes("alt") || labels.toLowerCase().includes("high")
            ? "Alta"
            : labels.toLowerCase().includes("baix") || labels.toLowerCase().includes("low")
              ? "Baixa"
              : "Média";

        const existing = tasks.find(
          (t) =>
            (plannerTaskId && t.plannerTaskId === plannerTaskId) ||
            (sandechCode && t.sandechCode === sandechCode && t.title.toLowerCase() === rawTitle.toLowerCase()),
        );

        return {
          key: `${idx}-${plannerTaskId ?? rawTitle}`,
          selected: true,
          plannerTaskId,
          title: rawTitle || `Tarefa ${idx + 1}`,
          bucket,
          mappedStatus,
          isNewBucket: !matchedStage && mappedStatus === bucket,
          docType,
          sandechCode,
          gedeUrl: urlMatch?.[0] ?? "",
          folderPath: netMatch?.[0] ?? undefined,
          startDate: startDate || undefined,
          dueDate,
          assigneeNames,
          priority,
          notes: desc,
          checklist,
          isDuplicate: !!existing,
          existingId: existing?.id,
        };
      });

      setRows(parsed);
      setFileName(file.name);
    } catch {
      toast.error("Não foi possível ler a planilha .xlsx");
    }
  };

  const selectedRows = useMemo(() => rows.filter((r) => r.selected), [rows]);

  const confirmImport = () => {
    if (!projectCode) { toast.error("Selecione o Projeto Mãe de destino"); return; }
    const toImport = selectedRows.filter((r) => !(r.isDuplicate && duplicateMode === "skip"));
    if (!toImport.length) { toast.error("Nenhuma tarefa selecionada para importar"); return; }

    const fallbackStage = stages[0]?.name ?? "Elaboração";
    const createdBuckets = new Set<string>();
    const personCache = [...people];

    const resolvePersonId = (name: string) => {
      const found = personCache.find((p) => p.name.toLowerCase() === name.toLowerCase());
      if (found) return found.id;
      const created = addPerson(name, "Colaborador");
      personCache.push(created);
      return created.id;
    };

    const tasksToUpsert: Task[] = toImport.map((r, i) => {
      let status = r.mappedStatus;
      if (r.isNewBucket) {
        if (createNewBuckets) {
          if (!createdBuckets.has(r.bucket)) {
            addStage(r.bucket, "#0ea5e9");
            createdBuckets.add(r.bucket);
          }
          status = r.bucket;
        } else {
          status = fallbackStage;
        }
      }
      const assignees = r.assigneeNames.map(resolvePersonId);
      return {
        id: r.existingId || `t${Date.now()}-${i}`,
        title: r.title,
        projectCode,
        phaseId: phaseId || undefined,
        docType: r.docType,
        sandechCode: r.sandechCode,
        plannerTaskId: r.plannerTaskId,
        gedeUrl: r.gedeUrl,
        folderPath: r.folderPath,
        startDate: r.startDate,
        dueDate: r.dueDate,
        status,
        priority: r.priority,
        notes: r.notes,
        assignees: assignees.length ? assignees : [personCache[0]?.id ?? "p1"],
        checklist: r.checklist,
      };
    });

    upsertManyTasks(tasksToUpsert);
    toast.success(`${tasksToUpsert.length} documento(s) importado(s) do Planner!`);
    setRows([]);
    setFileName("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Upload className="h-4 w-4" />Importar Planilha do Microsoft Planner (.xlsx)</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-3 rounded-lg border border-border bg-muted/30 p-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Empresa</Label>
              <Select value={companyId} onValueChange={(v) => { setCompanyId(v); setProjectCode(parentProjects.find((p) => p.companyId === v)?.code ?? ""); setPhaseId(""); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Projeto Mãe</Label>
              <Select value={projectCode} onValueChange={(v) => { setProjectCode(v); setPhaseId(""); }}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{companyProjects.map((p) => <SelectItem key={p.code} value={p.code}>{p.code} · {p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Fase</Label>
              <Select value={phaseId || "__none__"} onValueChange={(v) => setPhaseId(v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Sem fase" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sem fase</SelectItem>
                  {availablePhases.map((ph) => <SelectItem key={ph.id} value={ph.id}>{ph.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Label htmlFor="planner-xlsx" className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-primary/50 bg-primary/5 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/10">
              <Upload className="h-4 w-4" />
              {fileName || "Selecionar arquivo .xlsx do Planner"}
            </Label>
            <Input id="planner-xlsx" type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f); }} />

            <label className="flex items-center gap-2 text-xs">
              <Checkbox checked={createNewBuckets} onCheckedChange={(c) => setCreateNewBuckets(!!c)} />
              Criar colunas no Kanban para buckets novos
            </label>

            <div className="ml-auto flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">Duplicadas:</span>
              <Select value={duplicateMode} onValueChange={(v) => setDuplicateMode(v as "update" | "skip")}>
                <SelectTrigger className="h-8 w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="update">Atualizar existentes</SelectItem>
                  <SelectItem value="skip">Ignorar duplicadas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {rows.length > 0 && (
            <div className="max-h-80 overflow-auto rounded-lg border border-border">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-muted text-left text-muted-foreground">
                  <tr>
                    <th className="p-2"><CheckSquare className="h-3.5 w-3.5" /></th>
                    <th className="p-2">Tipo</th>
                    <th className="p-2">Título</th>
                    <th className="p-2">Código SANDECH</th>
                    <th className="p-2">Etapa / Bucket</th>
                    <th className="p-2">Prazo</th>
                    <th className="p-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((r, idx) => (
                    <tr key={r.key} className={!r.selected ? "opacity-50" : undefined}>
                      <td className="p-2">
                        <Checkbox checked={r.selected} onCheckedChange={(c) => setRows((prev) => prev.map((x, i) => (i === idx ? { ...x, selected: !!c } : x)))} />
                      </td>
                      <td className="p-2 font-mono font-semibold">[{r.docType}]</td>
                      <td className="max-w-[240px] truncate p-2 font-medium">{r.title}</td>
                      <td className="p-2 font-mono">{r.sandechCode || "—"}</td>
                      <td className="p-2">{r.mappedStatus}{r.isNewBucket && createNewBuckets ? " (nova)" : ""}</td>
                      <td className="p-2">{r.dueDate}</td>
                      <td className="p-2">
                        {r.isDuplicate ? (
                          <span className="inline-flex items-center gap-1 text-amber-600"><AlertCircle className="h-3 w-3" />Duplicada</span>
                        ) : (
                          <span className="text-emerald-600">Nova</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="button" disabled={selectedRows.length === 0} onClick={confirmImport}>
            Importar {selectedRows.length} tarefa(s)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
