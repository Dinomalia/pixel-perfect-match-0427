import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { BarChart3, CalendarDays, Home, Trash2, ShieldAlert, ChevronRight, KanbanSquare, LayoutList, Plus, Search } from "lucide-react";
import { TimelineView } from "@/components/planner/Timeline";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { PEOPLE, docLabel, TasksProvider, useTasks, type Status, type Task } from "@/lib/tasks";
import { KanbanView, type GroupBy } from "@/components/planner/KanbanView";
import { HomeView } from "@/components/planner/HomeView";
import { DashboardView } from "@/components/planner/DashboardView";
import { TableView } from "@/components/planner/TableView";
import { TaskDialog } from "@/components/planner/TaskDialog";
import { TrashView, useUndoShortcut } from "@/components/planner/Trash";

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
  component: () => (
    <TasksProvider><TooltipProvider delayDuration={200}><App /><Toaster richColors /></TooltipProvider></TasksProvider>
  ),
});

type View = "home" | "kanban" | "dashboard" | "table" | "timeline" | "trash";

function App() {
  const { filters, setFilters, projects, companies, docTypes, trash } = useTasks();
  useUndoShortcut();
  const [view, setView] = useState<View>("home");
  const [me, setMe] = useState("p1");
  const [groupBy, setGroupBy] = useState<GroupBy>("status");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [defStatus, setDefStatus] = useState<Status>("Elaboração");

  const openNew = (s: Status = "Elaboração") => { setEditing(null); setDefStatus(s); setOpen(true); };
  const openEdit = (t: Task) => { setEditing(t); setOpen(true); };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-navy text-navy-foreground">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-4 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-navy-foreground/10"><KanbanSquare className="h-5 w-5" /></div>
            <div className="min-w-0"><h1 className="truncate text-base font-bold leading-tight">ProjectHub</h1><p className="text-xs opacity-70">Gestão de tarefas e projetos</p></div>
          </div>
          <Tabs value={view} onValueChange={(v) => setView(v as View)} className="order-3 w-full sm:order-none sm:ml-6 sm:w-auto">
            <TabsList className="w-full bg-navy-foreground/10 sm:w-auto">
              <TabsTrigger value="home" className="nav-tab"><Home className="mr-1.5 h-4 w-4" />Meu Painel</TabsTrigger>
              <TabsTrigger value="kanban" className="nav-tab"><KanbanSquare className="mr-1.5 h-4 w-4" />Kanban</TabsTrigger>
              <TabsTrigger value="dashboard" className="nav-tab"><BarChart3 className="mr-1.5 h-4 w-4" />Dashboard</TabsTrigger>
              <TabsTrigger value="table" className="nav-tab"><LayoutList className="mr-1.5 h-4 w-4" />Tabela</TabsTrigger>
              <TabsTrigger value="timeline" className="nav-tab"><CalendarDays className="mr-1.5 h-4 w-4" />Cronograma</TabsTrigger>
              <TabsTrigger value="trash" className="nav-tab"><Trash2 className="mr-1.5 h-4 w-4" />Lixeira{trash.length > 0 && <span className="ml-1.5 rounded-full bg-destructive px-1.5 text-[10px] text-destructive-foreground">{trash.length}</span>}</TabsTrigger>
            </TabsList>
          </Tabs>
          <Select value={me} onValueChange={setMe}>
            <SelectTrigger className="ml-auto w-44 border-navy-foreground/20 bg-navy-foreground/10 text-navy-foreground" aria-label="Usuário atual"><SelectValue /></SelectTrigger>
            <SelectContent>{PEOPLE.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
          </Select>
          <Button onClick={() => openNew()} className=" bg-navy-foreground text-navy hover:bg-navy-foreground/90"><Plus className="h-4 w-4" />Novo Documento</Button>
        </div>
      </header>
      {view !== "home" && view !== "trash" && <div className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
          <nav aria-label="Escopo" className="flex flex-wrap items-center gap-1.5">
            <Select value={filters.company} onValueChange={(v) => setFilters({ company: v, project: "all" })}>
              <SelectTrigger className="w-44 font-semibold"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">Todas as empresas</SelectItem>{companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <Select value={filters.project} onValueChange={(v) => setFilters({ project: v })}>
              <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">Todos os projetos</SelectItem>{projects.filter((p) => filters.company === "all" || p.companyId === filters.company).map((p) => <SelectItem key={p.code} value={p.code}>{p.code} · {p.name}</SelectItem>)}</SelectContent>
            </Select>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <Select value={filters.docType} onValueChange={(v) => setFilters({ docType: v })}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">Todos os tipos</SelectItem>{docTypes.map((d) => <SelectItem key={d} value={d}>{d} — {docLabel(d)}</SelectItem>)}</SelectContent>
            </Select>
          </nav>
          <Select value={filters.person} onValueChange={(v) => setFilters({ person: v })}>
            <SelectTrigger className="w-full sm:w-52"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">Todos os colaboradores</SelectItem>{PEOPLE.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
          </Select>
          <Button variant={filters.qualityOnly ? "default" : "outline"} onClick={() => setFilters({ qualityOnly: !filters.qualityOnly })}><ShieldAlert className="h-4 w-4" />Retrabalho Qualidade</Button>
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Buscar documentos..." value={filters.search} onChange={(e) => setFilters({ search: e.target.value })} maxLength={100} />
          </div>
        </div>
      </div>}
      <main className="mx-auto max-w-[1600px] p-4 sm:p-6">
        {view === "home" && <HomeView me={me} onEdit={openEdit} onOpenProject={(code) => { setFilters({ company: "all", project: code, person: "all", docType: "all", search: "" }); setView("kanban"); }} />}
        {view === "kanban" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">Agrupar por</span>
              <Tabs value={groupBy} onValueChange={(v) => setGroupBy(v as GroupBy)}>
                <TabsList><TabsTrigger value="status">Status</TabsTrigger><TabsTrigger value="person">Colaborador</TabsTrigger><TabsTrigger value="project">Projeto</TabsTrigger></TabsList>
              </Tabs>
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
    </div>
  );
}
