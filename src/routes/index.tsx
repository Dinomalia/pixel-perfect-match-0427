import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { BarChart3, CalendarDays, FileSpreadsheet, Home, Trash2, ShieldAlert, ChevronRight, RotateCcw, SlidersHorizontal, Upload, UserPlus, KanbanSquare, LayoutList, LogOut, Plus, Search } from "lucide-react";
import { TimelineView } from "@/components/planner/Timeline";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AddPersonDialog } from "@/components/planner/AddPersonDialog";
import { Toaster } from "@/components/ui/sonner";
import { TasksProvider, useTasks, type Status, type Task } from "@/lib/tasks";
import { exportKanbanToExcel } from "@/lib/exportExcel";
import { toast } from "sonner";
import { KanbanView, type GroupBy } from "@/components/planner/KanbanView";
import { HomeView } from "@/components/planner/HomeView";
import { DashboardView } from "@/components/planner/DashboardView";
import { TableView } from "@/components/planner/TableView";
import { TaskDialog } from "@/components/planner/TaskDialog";
import { StageManagerDialog } from "@/components/planner/StageManagerDialog";
import { ImportPlannerDialog } from "@/components/planner/ImportPlannerDialog";
import { TrashView, useUndoShortcut } from "@/components/planner/Trash";
import { LoginScreen, clearAuthentication, isAuthenticated } from "@/components/planner/LoginScreen";

function IndexPage() {
  const [authed, setAuthed] = useState(() => isAuthenticated());
  if (!authed) return <LoginScreen onSuccess={() => setAuthed(true)} />;
  return (
    <TasksProvider>
      <TooltipProvider delayDuration={200}>
        <App onLogout={() => { clearAuthentication(); setAuthed(false); }} />
        <Toaster richColors />
      </TooltipProvider>
    </TasksProvider>
  );
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Gestão de Projetos — Kanban, Dashboard e Tarefas" },
      { name: "description", content: "Controle tarefas e projetos com quadro Kanban, dashboard analítico e tabela com filtros." },
      { property: "og:title", content: "Gestão de Projetos — Kanban, Dashboard e Tarefas" },
      { property: "og:description", content: "Controle tarefas e projetos com quadro Kanban, dashboard analítico e tabela com filtros." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: IndexPage,
});

type View = "home" | "kanban" | "dashboard" | "table" | "timeline" | "trash";

function App({ onLogout }: { onLogout?: () => void }) {
  const { filtered, people, filters, setFilters, projects, parentProjects, projectPhases, companies, trash, companyOf } = useTasks();
  useUndoShortcut();
  const [view, setView] = useState<View>("home");
  const [me, setMe] = useState("p1");
  const [groupBy, setGroupBy] = useState<GroupBy>("status");
  const [open, setOpen] = useState(false);
  const [addingPerson, setAddingPerson] = useState(false);
  const [stagesOpen, setStagesOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [defStatus, setDefStatus] = useState<Status>("Elaboração");

  const openNew = (s: Status = "Elaboração") => { setEditing(null); setDefStatus(s); setOpen(true); };
  const openEdit = (t: Task) => { setEditing(t); setOpen(true); };

  const selectedParent = parentProjects.find((pp) => pp.code === filters.project);
  const filteredPhases = selectedParent
    ? projectPhases.filter((ph) => ph.parentProjectId === selectedParent.id)
    : projectPhases.filter((ph) => {
        if (filters.company === "all") return true;
        const pp = parentProjects.find((p) => p.id === ph.parentProjectId);
        return pp?.companyId === filters.company;
      });

  return (
    <div className="min-h-screen w-full bg-background">
      <header className="w-full bg-navy text-navy-foreground">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-navy-foreground/10"><KanbanSquare className="h-5 w-5" /></div>
            <div className="min-w-0"><h1 className="truncate text-base font-bold leading-tight">ProjectHub</h1><p className="text-xs opacity-70">Gestão de tarefas e projetos</p></div>
          </div>
          <Tabs value={view} onValueChange={(v) => setView(v as View)} className="order-3 w-full sm:order-none sm:ml-4 sm:w-auto">
            <TabsList className="w-full flex-wrap bg-navy-foreground/10 sm:w-auto">
              <TabsTrigger value="home" className="nav-tab"><Home className="mr-1.5 h-4 w-4" />Meu Painel</TabsTrigger>
              <TabsTrigger value="kanban" className="nav-tab"><KanbanSquare className="mr-1.5 h-4 w-4" />Kanban</TabsTrigger>
              <TabsTrigger value="dashboard" className="nav-tab"><BarChart3 className="mr-1.5 h-4 w-4" />Dashboard</TabsTrigger>
              <TabsTrigger value="table" className="nav-tab"><LayoutList className="mr-1.5 h-4 w-4" />Tabela</TabsTrigger>
              <TabsTrigger value="timeline" className="nav-tab"><CalendarDays className="mr-1.5 h-4 w-4" />Cronograma</TabsTrigger>
              <TabsTrigger value="trash" className="nav-tab"><Trash2 className="mr-1.5 h-4 w-4" />Lixeira{trash.length > 0 && <span className="ml-1.5 rounded-full bg-destructive px-1.5 text-[10px] text-destructive-foreground">{trash.length}</span>}</TabsTrigger>
            </TabsList>
          </Tabs>
          <Select value={me} onValueChange={(v) => v === "__add" ? setAddingPerson(true) : setMe(v)}>
            <SelectTrigger className="ml-auto w-44 border-navy-foreground/20 bg-navy-foreground/10 text-navy-foreground" aria-label="Usuário atual"><SelectValue /></SelectTrigger>
            <SelectContent>{people.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}<SelectSeparator /><SelectItem value="__add" className="text-primary"><span className="inline-flex items-center gap-1.5"><UserPlus className="h-3.5 w-3.5" />Adicionar colaborador</span></SelectItem></SelectContent>
          </Select>
          <Button variant="secondary" size="sm" onClick={() => setImportOpen(true)} className="bg-navy-foreground/15 text-navy-foreground hover:bg-navy-foreground/25">
            <Upload className="mr-1.5 h-4 w-4" />Importar Planner
          </Button>
          <Button onClick={() => openNew()} className="bg-navy-foreground text-navy hover:bg-navy-foreground/90"><Plus className="h-4 w-4" />Novo Documento</Button>
          {onLogout && (
            <Button variant="ghost" size="icon" onClick={onLogout} title="Sair" aria-label="Sair" className="text-navy-foreground/80 hover:bg-navy-foreground/10 hover:text-navy-foreground">
              <LogOut className="h-4 w-4" />
            </Button>
          )}
        </div>
      </header>
      {view !== "home" && view !== "trash" && (
        <div className="border-b border-border bg-card">
          <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
            <nav aria-label="Escopo" className="flex flex-wrap items-center gap-1.5">
              <Select value={filters.company} onValueChange={(v) => setFilters({ company: v, project: "all", phase: "all" })}>
                <SelectTrigger className="w-44 font-semibold"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="all">Todas as Empresas</SelectItem>{companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
              <Select value={filters.project} onValueChange={(v) => setFilters({ project: v, phase: "all" })}>
                <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="all">Todos os Projetos</SelectItem>{projects.filter((p) => filters.company === "all" || p.companyId === filters.company).map((p) => <SelectItem key={p.code} value={p.code}>{p.code} · {p.name}</SelectItem>)}</SelectContent>
              </Select>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
              <Select value={filters.phase} onValueChange={(v) => setFilters({ phase: v })}>
                <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Fases</SelectItem>
                  {filteredPhases.map((ph) => <SelectItem key={ph.id} value={ph.id}>{ph.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </nav>
            <Select value={filters.person} onValueChange={(v) => setFilters({ person: v })}>
              <SelectTrigger className="w-full sm:w-52"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">Todos os Colaboradores</SelectItem>{people.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
            </Select>
            <Button variant={filters.qualityOnly ? "default" : "outline"} onClick={() => setFilters({ qualityOnly: !filters.qualityOnly })}><ShieldAlert className="h-4 w-4" />Retrabalho Qualidade</Button>
            <div className="relative min-w-[200px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder="Buscar por título, SANDECH ou cliente..." value={filters.search} onChange={(e) => setFilters({ search: e.target.value })} maxLength={100} />
            </div>
            <Button variant="outline" onClick={() => setFilters({ company: "all", project: "all", phase: "all", docType: "all", person: "all", qualityOnly: false, search: "" })}><RotateCcw className="h-4 w-4" />Limpar filtros</Button>
          </div>
        </div>
      )}
      <main className="mx-auto max-w-[1600px] p-4 sm:p-6">
        {view === "home" && <HomeView me={me} onEdit={openEdit} />}
        {view === "kanban" && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">Agrupar por</span>
              <Tabs value={groupBy} onValueChange={(v) => setGroupBy(v as GroupBy)}>
                <TabsList><TabsTrigger value="status">Status</TabsTrigger><TabsTrigger value="person">Colaborador</TabsTrigger><TabsTrigger value="project">Projeto</TabsTrigger></TabsList>
              </Tabs>
              <div className="ml-auto flex flex-wrap items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setStagesOpen(true)}>
                  <SlidersHorizontal className="mr-1.5 h-4 w-4" />Etapas
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (filtered.length === 0) {
                      toast.error("Nenhum documento para exportar");
                      return;
                    }
                    exportKanbanToExcel(filtered, projects, companyOf);
                    toast.success(`${filtered.length} documento(s) exportado(s) para Excel`);
                  }}
                >
                  <FileSpreadsheet className="mr-1.5 h-4 w-4" />
                  Exportar Excel
                </Button>
              </div>
            </div>
            <KanbanView groupBy={groupBy} onEdit={openEdit} onNew={openNew} />
          </div>
        )}
        {view === "dashboard" && <DashboardView />}
        {view === "table" && <TableView onEdit={openEdit} />}
        {view === "timeline" && <TimelineView onEdit={openEdit} />}
        {view === "trash" && <TrashView />}
      </main>
      <TaskDialog open={open} onOpenChange={setOpen} task={editing} defaultStatus={defStatus} />
      <AddPersonDialog open={addingPerson} onClose={() => setAddingPerson(false)} onAdded={setMe} />
      <StageManagerDialog open={stagesOpen} onClose={() => setStagesOpen(false)} />
      <ImportPlannerDialog open={importOpen} onClose={() => setImportOpen(false)} />
    </div>
  );
}
