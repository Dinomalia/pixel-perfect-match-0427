import { useState } from "react";
import { Check, FolderKanban, Layers, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTasks, type Task } from "@/lib/tasks";
import { DocTypeBadge, StatusBadge } from "./Shared";

export function ProjectsView({ onEditTask, onOpenProject }: { onEditTask: (t: Task) => void; onOpenProject: (code: string, phaseId?: string) => void }) {
  const { companies, parentProjects, projectPhases, tasks, addParentProject, addPhase, renamePhase, deletePhase } = useTasks();

  const [companyId, setCompanyId] = useState(companies[0]?.id ?? "");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [newPhaseByParent, setNewPhaseByParent] = useState<Record<string, string>>({});
  const [editingPhaseId, setEditingPhaseId] = useState<string | null>(null);
  const [editingPhaseName, setEditingPhaseName] = useState("");

  const createProject = () => {
    const cid = companyId || companies[0]?.id || "";
    if (!cid) { toast.error("Selecione uma empresa"); return; }
    if (!code.trim() || !name.trim()) { toast.error("Informe código e nome do Projeto Mãe"); return; }
    addParentProject({ companyId: cid, code: code.trim().toUpperCase(), name: name.trim() });
    setCode("");
    setName("");
    toast.success("Projeto Mãe cadastrado!");
  };

  const handleAddPhase = (parentId: string) => {
    const pName = (newPhaseByParent[parentId] ?? "").trim();
    if (!pName) { toast.error("Informe o nome da fase"); return; }
    addPhase(parentId, pName);
    setNewPhaseByParent((prev) => ({ ...prev, [parentId]: "" }));
    toast.success(`Fase "${pName}" adicionada!`);
  };

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-border bg-card p-5 shadow-card">
        <div className="mb-4 flex items-center gap-2">
          <FolderKanban className="h-5 w-5 text-primary" />
          <h2 className="text-base font-bold">Cadastrar Projeto Mãe</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-[200px_160px_1fr_auto] sm:items-end">
          <div className="space-y-1.5">
            <Label>Empresa / Cliente</Label>
            <Select value={companyId} onValueChange={setCompanyId}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Código</Label>
            <Input placeholder="PRJ-1600" value={code} onChange={(e) => setCode(e.target.value)} maxLength={30} />
          </div>
          <div className="space-y-1.5">
            <Label>Nome do Projeto Mãe</Label>
            <Input placeholder="Ex.: Hot Oil" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />
          </div>
          <Button type="button" onClick={createProject}><Plus className="mr-1.5 h-4 w-4" />Adicionar Projeto</Button>
        </div>
      </section>

      <div className="grid gap-5">
        {parentProjects.map((pp) => {
          const comp = companies.find((c) => c.id === pp.companyId);
          const phases = projectPhases.filter((ph) => ph.parentProjectId === pp.id).sort((a, b) => a.orderIndex - b.orderIndex);
          const projectTasks = tasks.filter((t) => t.projectCode === pp.code);
          const unphased = projectTasks.filter((t) => !t.phaseId || !phases.some((ph) => ph.id === t.phaseId));

          return (
            <section key={pp.id} className="rounded-xl border border-border bg-card p-5 shadow-card">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{comp?.name ?? "Sem empresa"}</p>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-primary">{pp.code}</span>
                    <h3 className="text-lg font-bold">{pp.name}</h3>
                  </div>
                  <p className="text-xs text-muted-foreground">{phases.length} fase(s) · {projectTasks.length} documento(s)</p>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    className="h-8 w-52 text-xs"
                    placeholder="Nova fase (ex: Projeto Básico)"
                    value={newPhaseByParent[pp.id] ?? ""}
                    onChange={(e) => setNewPhaseByParent((prev) => ({ ...prev, [pp.id]: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === "Enter") handleAddPhase(pp.id); }}
                  />
                  <Button type="button" size="sm" variant="outline" onClick={() => handleAddPhase(pp.id)}>
                    <Plus className="mr-1 h-3.5 w-3.5" />Fase
                  </Button>
                  <Button type="button" size="sm" onClick={() => onOpenProject(pp.code)}>Abrir no Kanban</Button>
                </div>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {phases.map((ph) => {
                  const phTasks = projectTasks.filter((t) => t.phaseId === ph.id);
                  const isEditing = editingPhaseId === ph.id;
                  return (
                    <div key={ph.id} className="flex flex-col gap-2.5 rounded-lg border border-border bg-muted/30 p-3.5">
                      <div className="flex items-center justify-between gap-2">
                        {isEditing ? (
                          <div className="flex flex-1 items-center gap-1">
                            <Input
                              className="h-7 text-xs"
                              value={editingPhaseName}
                              onChange={(e) => setEditingPhaseName(e.target.value)}
                              autoFocus
                            />
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-primary"
                              onClick={() => {
                                if (editingPhaseName.trim()) renamePhase(ph.id, editingPhaseName.trim());
                                setEditingPhaseId(null);
                              }}
                            >
                              <Check className="h-3.5 w-3.5" />
                            </Button>
                            <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingPhaseId(null)}>
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => onOpenProject(pp.code, ph.id)}
                              className="flex min-w-0 items-center gap-1.5 text-left text-sm font-semibold hover:text-primary"
                            >
                              <Layers className="h-3.5 w-3.5 shrink-0 text-primary" />
                              <span className="truncate">{ph.name}</span>
                              <span className="rounded-full bg-card px-1.5 text-[11px] font-normal text-muted-foreground">{phTasks.length}</span>
                            </button>
                            <div className="flex items-center gap-0.5">
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                title="Renomear fase"
                                onClick={() => { setEditingPhaseId(ph.id); setEditingPhaseName(ph.name); }}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-destructive"
                                title="Excluir fase"
                                onClick={() => {
                                  if (window.confirm(`Excluir a fase "${ph.name}"? Os documentos continuarão no projeto.`)) deletePhase(ph.id);
                                }}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        {phTasks.map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => onEditTask(t)}
                            className="flex w-full items-center justify-between gap-2 rounded-md border border-border bg-card px-2.5 py-1.5 text-left text-xs transition hover:bg-accent"
                          >
                            <span className="flex min-w-0 items-center gap-1.5">
                              <DocTypeBadge type={t.docType} />
                              <span className="truncate font-medium">{t.title}</span>
                            </span>
                            <StatusBadge status={t.status} />
                          </button>
                        ))}
                        {phTasks.length === 0 && <p className="py-2 text-xs text-muted-foreground">Nenhum documento nesta fase.</p>}
                      </div>
                    </div>
                  );
                })}

                {unphased.length > 0 && (
                  <div className="flex flex-col gap-2.5 rounded-lg border border-dashed border-border bg-muted/20 p-3.5">
                    <div className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
                      <span>Sem fase definida</span>
                      <span className="rounded-full bg-card px-1.5 text-[11px] font-normal">{unphased.length}</span>
                    </div>
                    <div className="space-y-1.5">
                      {unphased.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => onEditTask(t)}
                          className="flex w-full items-center justify-between gap-2 rounded-md border border-border bg-card px-2.5 py-1.5 text-left text-xs transition hover:bg-accent"
                        >
                          <span className="flex min-w-0 items-center gap-1.5">
                            <DocTypeBadge type={t.docType} />
                            <span className="truncate font-medium">{t.title}</span>
                          </span>
                          <StatusBadge status={t.status} />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
