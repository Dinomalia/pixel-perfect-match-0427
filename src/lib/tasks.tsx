import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export const STATUSES = ["Elaboração", "Qualidade", "Retrabalho", "Aprovado"] as const;
export type Status = (typeof STATUSES)[number];
export const PRIORITIES = ["Baixa", "Média", "Alta", "Crítica"] as const;
export type Priority = (typeof PRIORITIES)[number];

export type Project = { code: string; name: string };
export type Person = { id: string; name: string; email: string };
export type Task = {
  id: string;
  title: string;
  projectCode: string;
  gedeUrl: string;
  assignees: string[];
  dueDate: string;
  status: Status;
  priority: Priority;
  notes: string;
};

export const STATUS_STYLE: Record<Status, { badge: string; dot: string; chart: string }> = {
  Elaboração: { badge: "bg-status-draft/15 text-status-draft-foreground border-status-draft/40", dot: "bg-status-draft", chart: "var(--status-draft)" },
  Qualidade: { badge: "bg-status-quality/15 text-status-quality border-status-quality/40", dot: "bg-status-quality", chart: "var(--status-quality)" },
  Retrabalho: { badge: "bg-status-rework/15 text-status-rework border-status-rework/40", dot: "bg-status-rework", chart: "var(--status-rework)" },
  Aprovado: { badge: "bg-status-approved/15 text-status-approved border-status-approved/40", dot: "bg-status-approved", chart: "var(--status-approved)" },
};

export const PRIORITY_STYLE: Record<Priority, string> = {
  Baixa: "bg-muted text-muted-foreground border-border",
  Média: "bg-status-quality/10 text-status-quality border-status-quality/30",
  Alta: "bg-status-rework/10 text-status-rework border-status-rework/30",
  Crítica: "bg-destructive text-destructive-foreground border-destructive",
};

export const PEOPLE: Person[] = [
  { id: "p1", name: "Ana Souza", email: "ana.souza@empresa.com" },
  { id: "p2", name: "Bruno Lima", email: "bruno.lima@empresa.com" },
  { id: "p3", name: "Carla Mendes", email: "carla.mendes@empresa.com" },
  { id: "p4", name: "Diego Rocha", email: "diego.rocha@empresa.com" },
  { id: "p5", name: "Elisa Martins", email: "elisa.martins@empresa.com" },
];

const SEED_PROJECTS: Project[] = [
  { code: "PRJ-2026-01", name: "Subestação Norte" },
  { code: "PRJ-2026-02", name: "Modernização ETA" },
  { code: "PRJ-2026-03", name: "Linha de Transmissão Sul" },
];

const t = (id: string, title: string, projectCode: string, assignees: string[], dueDate: string, status: Status, priority: Priority, notes = ""): Task => ({
  id, title, projectCode, assignees, dueDate, status, priority, notes,
  gedeUrl: `https://gede.empresa.com/docs/${projectCode}/${id}`,
});

const SEED_TASKS: Task[] = [
  t("t1", "Memorial descritivo elétrico", "PRJ-2026-01", ["p1"], "2026-10-15", "Elaboração", "Alta", "Revisar normas NBR 5410."),
  t("t2", "Diagrama unifilar", "PRJ-2026-01", ["p2", "p1"], "2026-10-20", "Qualidade", "Crítica"),
  t("t3", "Lista de materiais", "PRJ-2026-01", ["p3"], "2026-10-10", "Aprovado", "Média"),
  t("t4", "Planta de aterramento", "PRJ-2026-01", ["p4"], "2026-10-12", "Retrabalho", "Alta", "Ajustar malha conforme parecer."),
  t("t5", "Especificação de bombas", "PRJ-2026-02", ["p5"], "2026-10-18", "Elaboração", "Média"),
  t("t6", "Fluxograma de processo", "PRJ-2026-02", ["p1", "p5"], "2026-10-09", "Aprovado", "Alta"),
  t("t7", "Cálculo hidráulico", "PRJ-2026-02", ["p2"], "2026-10-25", "Qualidade", "Média"),
  t("t8", "Arranjo civil", "PRJ-2026-02", ["p3"], "2026-10-14", "Retrabalho", "Crítica", "Incompatibilidade com estrutura."),
  t("t9", "Relatório de sondagem", "PRJ-2026-02", ["p4"], "2026-10-05", "Aprovado", "Baixa"),
  t("t10", "Perfil topográfico", "PRJ-2026-03", ["p2"], "2026-10-30", "Elaboração", "Alta"),
  t("t11", "Projeto de fundações das torres", "PRJ-2026-03", ["p3", "p4"], "2026-11-05", "Elaboração", "Crítica"),
  t("t12", "Estudo de faixa de servidão", "PRJ-2026-03", ["p5"], "2026-10-22", "Qualidade", "Média"),
  t("t13", "Licenciamento ambiental", "PRJ-2026-03", ["p1"], "2026-10-08", "Aprovado", "Alta"),
  t("t14", "Plotação das torres", "PRJ-2026-03", ["p4"], "2026-10-19", "Retrabalho", "Média"),
];

type Filters = { search: string; project: string; person: string };

type Ctx = {
  tasks: Task[];
  projects: Project[];
  filtered: Task[];
  filters: Filters;
  setFilters: (f: Partial<Filters>) => void;
  upsertTask: (task: Task) => void;
  deleteTask: (id: string) => void;
  moveTask: (id: string, status: Status) => void;
  addProject: (p: Project) => void;
};

const TasksContext = createContext<Ctx | null>(null);
const KEY = "planner-bi-v1";

export function TasksProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>(SEED_TASKS);
  const [projects, setProjects] = useState<Project[]>(SEED_PROJECTS);
  const [loaded, setLoaded] = useState(false);
  const [filters, setF] = useState<Filters>({ search: "", project: "all", person: "all" });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const d = JSON.parse(raw);
        if (Array.isArray(d.tasks)) setTasks(d.tasks);
        if (Array.isArray(d.projects)) setProjects(d.projects);
      }
    } catch {}
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (loaded) localStorage.setItem(KEY, JSON.stringify({ tasks, projects }));
  }, [tasks, projects, loaded]);

  const filtered = useMemo(() => {
    const q = filters.search.toLowerCase().trim();
    return tasks.filter((t) => {
      if (filters.project !== "all" && t.projectCode !== filters.project) return false;
      if (filters.person !== "all" && !t.assignees.includes(filters.person)) return false;
      if (!q) return true;
      const proj = projects.find((p) => p.code === t.projectCode)?.name ?? "";
      const names = t.assignees.map((a) => personById(a)?.name ?? "").join(" ");
      return `${t.title} ${t.projectCode} ${proj} ${names} ${t.notes}`.toLowerCase().includes(q);
    });
  }, [tasks, filters, projects]);

  const value: Ctx = {
    tasks, projects, filtered, filters,
    setFilters: (f) => setF((p) => ({ ...p, ...f })),
    upsertTask: (task) => setTasks((ts) => (ts.some((x) => x.id === task.id) ? ts.map((x) => (x.id === task.id ? task : x)) : [...ts, task])),
    deleteTask: (id) => setTasks((ts) => ts.filter((x) => x.id !== id)),
    moveTask: (id, status) => setTasks((ts) => ts.map((x) => (x.id === id ? { ...x, status } : x))),
    addProject: (p) => setProjects((ps) => (ps.some((x) => x.code === p.code) ? ps : [...ps, p])),
  };
  return <TasksContext.Provider value={value}>{children}</TasksContext.Provider>;
}

export function useTasks() {
  const c = useContext(TasksContext);
  if (!c) throw new Error("useTasks outside provider");
  return c;
}

export const personById = (id: string) => PEOPLE.find((p) => p.id === id);
export const initials = (name: string) => name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
export const fmtDate = (d: string) => (d ? d.split("-").reverse().join("/") : "—");
