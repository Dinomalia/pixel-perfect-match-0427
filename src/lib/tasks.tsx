import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

export const STATUSES = ["Elaboração", "Verificação", "Qualidade", "Retrabalho", "Em Aprovação", "Aprovado"] as const;
export type Status = (typeof STATUSES)[number];
export const PRIORITIES = ["Baixa", "Média", "Alta", "Crítica"] as const;
export type Priority = (typeof PRIORITIES)[number];

export type DocType = { code: string; label: string };
export const DEFAULT_DOC_TYPES: DocType[] = [
  { code: "FD", label: "Folha de Dados" },
  { code: "MD", label: "Memorial Descritivo" },
  { code: "ET", label: "Especificação Técnica" },
  { code: "MC", label: "Memória de Cálculo" },
  { code: "DE", label: "Desenho de Engenharia" },
  { code: "LD", label: "Lista de Documentos" },
];

export type Company = { id: string; name: string };
export type Project = { code: string; name: string; companyId: string };
export type Person = { id: string; name: string; email: string; role: string };
export type Task = {
  id: string;
  title: string;
  projectCode: string;
  docType: string;
  gedeUrl: string;
  assignees: string[];
  dueDate: string;
  status: Status;
  priority: Priority;
  notes: string;
  revision?: string;
  activeRevisionId?: string;
  history?: RevisionSnapshot[] | undefined;
  deletedAt?: string | undefined;
  qualityRework?: number | undefined;
  qualityReworkNote?: string | undefined;
  folderPath?: string | undefined;
  checklist?: ChecklistItem[] | undefined;
  showChecklistOnCard?: boolean | undefined;
};
export type ChecklistItem = { id: string; text: string; done: boolean };
export type TrashRevision = { id: string; taskId: string; taskTitle: string; snap: RevisionSnapshot; wasCurrent: boolean; deletedAt: string };
export type TrashItem = { kind: "card"; id: string; title: string; rev: string; status: Status; deletedAt: string } | ({ kind: "revision" } & TrashRevision);
export type RevisionSnapshot = { rev: string; status: Status; assignees: string[]; gedeUrl: string; dueDate: string; note: string; archivedAt: string; title?: string; projectCode?: string; docType?: string; priority?: Priority; folderPath?: string | undefined; qualityRework?: number | undefined; qualityReworkNote?: string | undefined; checklist?: ChecklistItem[] | undefined; showChecklistOnCard?: boolean | undefined };
export type NewRevisionInput = { rev: string; status: Status; gedeUrl: string; note: string; dueDate: string };

export const isNetPath = (v: string) => /^([a-zA-Z]:[\\/]|\\\\)/.test(v.trim());
export const revOf = (t: Task) => t.revision || "0";
export function snapshotOf(t: Task, archivedAt: string): RevisionSnapshot {
  return { rev: revOf(t), status: t.status, assignees: [...t.assignees], gedeUrl: t.gedeUrl, dueDate: t.dueDate, note: t.notes, archivedAt, title: t.title, projectCode: t.projectCode, docType: t.docType, priority: t.priority, folderPath: t.folderPath, qualityRework: t.qualityRework, qualityReworkNote: t.qualityReworkNote, checklist: t.checklist?.map((c) => ({ ...c })), showChecklistOnCard: t.showChecklistOnCard };
}

function applySnapshot(t: Task, s: RevisionSnapshot): Task {
  return { ...t, revision: s.rev, status: s.status, assignees: [...s.assignees], gedeUrl: s.gedeUrl, dueDate: s.dueDate, notes: s.note, title: s.title ?? t.title, projectCode: s.projectCode ?? t.projectCode, docType: s.docType ?? t.docType, priority: s.priority ?? t.priority, folderPath: s.folderPath, qualityRework: s.qualityRework, qualityReworkNote: s.qualityReworkNote, checklist: s.checklist?.map((c) => ({ ...c })), showChecklistOnCard: s.showChecklistOnCard };
}

export function selectRevision(t: Task, rev?: string): Task {
  const selected = t.history?.find((h) => h.rev === rev);
  if (!selected || rev === revOf(t)) return { ...t, activeRevisionId: revOf(t) };
  return { ...applySnapshot(t, selected), activeRevisionId: selected.rev, history: [...(t.history ?? []).filter((h) => h.rev !== selected.rev), snapshotOf(t, "")] };
}

export function updateRevision(t: Task, edited: Task): Task {
  const rev = edited.activeRevisionId ?? revOf(edited);
  if (rev === revOf(t)) {
    const { activeRevisionId: _active, ...data } = edited;
    return { ...data, revision: revOf(t), history: t.history, deletedAt: t.deletedAt };
  }
  if (!t.history?.some((h) => h.rev === rev)) return t;
  return { ...t, history: t.history.map((h) => h.rev === rev ? { ...snapshotOf(edited, h.archivedAt), rev } : h) };
}
export const nextRev = (r: string) => {
  const v = r.trim().toUpperCase();
  if (/^\d+$/.test(v)) return String(Number(v) + 1);
  if (/^[A-Z]$/.test(v)) return v === "Z" ? "0" : String.fromCharCode(v.charCodeAt(0) + 1);
  return v + "1";
};

export const STATUS_STYLE: Record<Status, { badge: string; dot: string; chart: string; border: string }> = {
  Elaboração: { badge: "bg-status-draft/15 text-status-draft-foreground border-status-draft/40", dot: "bg-status-draft", chart: "var(--status-draft)", border: "border-l-status-draft" },
  Verificação: { badge: "bg-status-verify/15 text-status-verify border-status-verify/40", dot: "bg-status-verify", chart: "var(--status-verify)", border: "border-l-status-verify" },
  Qualidade: { badge: "bg-status-quality/15 text-status-quality border-status-quality/40", dot: "bg-status-quality", chart: "var(--status-quality)", border: "border-l-status-quality" },
  Retrabalho: { badge: "bg-status-rework/15 text-status-rework border-status-rework/40", dot: "bg-status-rework", chart: "var(--status-rework)", border: "border-l-status-rework" },
  "Em Aprovação": { badge: "bg-status-pending/15 text-status-pending border-status-pending/40", dot: "bg-status-pending", chart: "var(--status-pending)", border: "border-l-status-pending" },
  Aprovado: { badge: "bg-status-approved/15 text-status-approved border-status-approved/40", dot: "bg-status-approved", chart: "var(--status-approved)", border: "border-l-status-approved" },
};

export const PRIORITY_STYLE: Record<Priority, string> = {
  Baixa: "bg-muted text-muted-foreground border-border",
  Média: "bg-status-quality/10 text-status-quality border-status-quality/30",
  Alta: "bg-status-rework/10 text-status-rework border-status-rework/30",
  Crítica: "bg-destructive text-destructive-foreground border-destructive",
};

export const PEOPLE: Person[] = [
  { id: "p1", name: "Ana Souza", role: "Engenheira de Processos", email: "ana.souza@empresa.com" },
  { id: "p2", name: "Bruno Lima", role: "Engenheiro Mecânico", email: "bruno.lima@empresa.com" },
  { id: "p3", name: "Carla Mendes", role: "Projetista Sênior", email: "carla.mendes@empresa.com" },
  { id: "p4", name: "Diego Rocha", role: "Engenheiro de Instrumentação", email: "diego.rocha@empresa.com" },
  { id: "p5", name: "Elisa Martins", role: "Coordenadora de Projetos", email: "elisa.martins@empresa.com" },
];

const SEED_COMPANIES: Company[] = [
  { id: "c1", name: "PRIO" },
  { id: "c2", name: "Petrobras" },
  { id: "c3", name: "Equinor" },
];

const SEED_PROJECTS: Project[] = [
  { code: "PRJ-1420", name: "Adequação de Compressores", companyId: "c1" },
  { code: "PRJ-1388", name: "Modernização de Utilidades", companyId: "c2" },
  { code: "PRJ-1502", name: "Sistema de Injeção de Água", companyId: "c3" },
];

const t = (id: string, docType: string, title: string, projectCode: string, assignees: string[], dueDate: string, status: Status, priority: Priority, notes = ""): Task => ({
  id, docType, title, projectCode, assignees, dueDate, status, priority, notes,
  gedeUrl: `https://gede.empresa.com/docs/${projectCode}/${id}`,
});

const SEED_TASKS_BASE: Task[] = [
  t("t1", "MD", "Memorial descritivo de instrumentação", "PRJ-1420", ["p1"], "2026-10-15", "Elaboração", "Alta", "Revisar premissas do cliente."),
  t("t2", "DE", "Fluxograma de engenharia (P&ID)", "PRJ-1420", ["p2", "p1"], "2026-10-20", "Qualidade", "Crítica"),
  t("t3", "FD", "Folha de dados do compressor K-101", "PRJ-1420", ["p3"], "2026-10-10", "Aprovado", "Média"),
  t("t4", "MC", "Memória de cálculo de válvulas de alívio", "PRJ-1420", ["p4"], "2026-10-12", "Retrabalho", "Alta", "Atender comentários do DCC."),
  t("t5", "ET", "Especificação técnica de bombas", "PRJ-1388", ["p5"], "2026-10-18", "Em Aprovação", "Média"),
  t("t6", "LD", "Lista de linhas", "PRJ-1388", ["p1", "p5"], "2026-10-09", "Aprovado", "Alta"),
  t("t7", "MC", "Cálculo hidráulico da rede", "PRJ-1388", ["p2"], "2026-10-25", "Qualidade", "Média"),
  t("t8", "DE", "Arranjo de tubulação", "PRJ-1388", ["p3"], "2026-10-14", "Retrabalho", "Crítica", "Interferência com estrutura."),
  t("t9", "FD", "Folha de dados de trocadores", "PRJ-1388", ["p4"], "2026-10-05", "Em Aprovação", "Baixa"),
  t("t10", "ET", "Especificação de painéis elétricos", "PRJ-1502", ["p2"], "2026-10-30", "Elaboração", "Alta"),
  t("t11", "MD", "Memorial descritivo do sistema", "PRJ-1502", ["p3", "p4"], "2026-11-05", "Elaboração", "Crítica"),
  t("t12", "LD", "Lista de documentos do projeto", "PRJ-1502", ["p5"], "2026-10-22", "Em Aprovação", "Média"),
  t("t13", "FD", "Folha de dados de filtros", "PRJ-1502", ["p1"], "2026-10-08", "Aprovado", "Alta"),
  t("t14", "DE", "Diagrama unifilar", "PRJ-1502", ["p4"], "2026-10-19", "Qualidade", "Média"),
];

const SEED_TASKS: Task[] = SEED_TASKS_BASE.map((x) => {
  if (x.id === "t8") return { ...x, qualityRework: 1 };
  if (x.id === "t2") return { ...x, folderPath: "Z:\\Projetos\\PRJ-1420\\P&ID", qualityRework: 1, revision: "B", history: [
    { rev: "0", status: "Aprovado", assignees: ["p2"], gedeUrl: `${x.gedeUrl}/rev0`, dueDate: "2026-08-10", note: "Emissão inicial.", archivedAt: "2026-08-12" },
    { rev: "A", status: "Retrabalho", assignees: ["p2", "p1"], gedeUrl: `${x.gedeUrl}/revA`, dueDate: "2026-09-15", note: "Inclusão de novas linhas de utilidades.", archivedAt: "2026-09-20" },
  ] };
  if (x.id === "t4") return { ...x, revision: "1", history: [
    { rev: "0", status: "Em Aprovação", assignees: ["p4"], gedeUrl: `${x.gedeUrl}/rev0`, dueDate: "2026-09-01", note: "Emissão para comentários.", archivedAt: "2026-09-05" },
  ] };
  return x;
});

type Filters = { search: string; company: string; project: string; person: string; docType: string; qualityOnly?: boolean };

type Ctx = {
  tasks: Task[];
  companies: Company[];
  projects: Project[];
  docTypes: string[];
  addDocType: (code: string, label: string) => void;
  filtered: Task[];
  filters: Filters;
  setFilters: (f: Partial<Filters>) => void;
  upsertTask: (task: Task) => void;
  deleteTask: (id: string) => void;
  deleteRevision: (taskId: string, rev: string | null) => void;
  trash: TrashItem[];
  restore: (item: TrashItem) => void;
  purge: (item: TrashItem) => void;
  undo: () => void;
  moveTask: (id: string, status: Status) => void;
  newRevision: (id: string, input: NewRevisionInput) => void;
  swapRevision: (id: string, rev: string) => void;
  toggleQualityRework: (id: string) => void;
  updateChecklist: (id: string, fn: (t: Task) => Partial<Pick<Task, "checklist" | "showChecklistOnCard">>) => void;
  addProject: (p: Project) => void;
  addCompany: (name: string) => string;
  companyOf: (projectCode: string) => Company | undefined;
  people: Person[];
  addPerson: (name: string, role: string) => Person;
};

const TasksContext = createContext<Ctx | null>(null);
const KEY = "planner-bi-v2";

export function TasksProvider({ children }: { children: ReactNode }) {
  const [allTasks, setTasks] = useState<Task[]>(SEED_TASKS);
  const [activeRevisions, setActiveRevisions] = useState<Record<string, string>>({});
  const [revTrash, setRevTrash] = useState<TrashRevision[]>([]);
  const [undoStack, setUndoStack] = useState<TrashItem[]>([]);
  const tasks = useMemo(() => allTasks.filter((t) => !t.deletedAt).map((t) => selectRevision(t, activeRevisions[t.id])), [allTasks, activeRevisions]);
  const [projects, setProjects] = useState<Project[]>(SEED_PROJECTS);
  const [companies, setCompanies] = useState<Company[]>(SEED_COMPANIES);
  const [people, setPeople] = useState<Person[]>(PEOPLE);
  registerPeople(people);
  const [customDocTypes, setCustomDocTypes] = useState<DocType[]>([]);
  registerDocTypes(customDocTypes);
  const [loaded, setLoaded] = useState(false);
  const [filters, setF] = useState<Filters>({ search: "", company: "all", project: "all", person: "all", docType: "all" });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const d = JSON.parse(raw);
        if (Array.isArray(d.tasks)) setTasks(d.tasks);
        if (Array.isArray(d.projects)) setProjects(d.projects);
        if (Array.isArray(d.companies)) setCompanies(d.companies);
        if (Array.isArray(d.revTrash)) setRevTrash(d.revTrash);
        if (Array.isArray(d.people)) setPeople(d.people);
        if (Array.isArray(d.customDocTypes)) setCustomDocTypes(d.customDocTypes);
      }
    } catch {}
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (loaded) localStorage.setItem(KEY, JSON.stringify({ tasks: allTasks, projects, companies, revTrash, people, customDocTypes }));
  }, [allTasks, projects, companies, revTrash, people, customDocTypes, loaded]);

  const companyOf = (code: string) => {
    const p = projects.find((x) => x.code === code);
    return companies.find((c) => c.id === p?.companyId);
  };

  const docTypes = useMemo(() => {
    const s = new Set(DEFAULT_DOC_TYPES.map((d) => d.code));
    customDocTypes.forEach((d) => s.add(d.code));
    tasks.forEach((t) => t.docType && s.add(t.docType));
    return [...s];
  }, [tasks, customDocTypes]);

  const filtered = useMemo(() => {
    const q = filters.search.toLowerCase().trim();
    return tasks.filter((t) => {
      const proj = projects.find((p) => p.code === t.projectCode);
      if (filters.company !== "all" && proj?.companyId !== filters.company) return false;
      if (filters.project !== "all" && t.projectCode !== filters.project) return false;
      if (filters.person !== "all" && !t.assignees.includes(filters.person)) return false;
      if (filters.docType !== "all" && t.docType !== filters.docType) return false;
      if (filters.qualityOnly && !(t.qualityRework ?? 0)) return false;
      if (!q) return true;
      const comp = companies.find((c) => c.id === proj?.companyId)?.name ?? "";
      const names = t.assignees.map((a) => personById(a)?.name ?? "").join(" ");
      return `${t.title} ${t.docType} ${t.projectCode} ${proj?.name ?? ""} ${comp} ${names} ${t.notes}`.toLowerCase().includes(q);
    });
  }, [tasks, filters, projects, companies]);

  const now = () => new Date().toISOString();
  const trash: TrashItem[] = [
    ...allTasks.flatMap((t) => t.deletedAt ? [{ kind: "card" as const, id: t.id, title: t.title, rev: revOf(t), status: t.status, deletedAt: t.deletedAt }] : []),
    ...revTrash.map((r) => ({ kind: "revision" as const, ...r })),
  ].sort((a, b) => b.deletedAt.localeCompare(a.deletedAt));

  const restore = (item: TrashItem) => {
    setUndoStack((u) => u.filter((x) => x.id !== item.id));
    if (item.kind === "card") { setTasks((ts) => ts.map((x) => (x.id === item.id ? { ...x, deletedAt: undefined } : x))); return; }
    setRevTrash((r) => r.filter((x) => x.id !== item.id));
    setTasks((ts) => ts.map((x) => {
      if (x.id !== item.taskId) return x;
      if (item.wasCurrent) {
        const cur = snapshotOf(x, now().slice(0, 10));
        const s = item.snap;
        return { ...applySnapshot(x, s), history: [...(x.history ?? []), cur] };
      }
      return { ...x, history: [...(x.history ?? []), item.snap].sort((a, b) => a.archivedAt.localeCompare(b.archivedAt)) };
    }));
  };

  const undoRef = useRef<() => void>(() => {});
  const value: Ctx & { _undoImpl: () => void } = {
    trash, restore,
    purge: (item) => item.kind === "card" ? setTasks((ts) => ts.filter((x) => x.id !== item.id)) : setRevTrash((r) => r.filter((x) => x.id !== item.id)),
    undo: () => undoRef.current(),
    _undoImpl: () => {
      const last = undoStack[undoStack.length - 1];
      if (last && trash.some((x) => x.id === last.id)) restore(last);
      else setUndoStack((u) => u.slice(0, -1));
    },
    deleteRevision: (taskId, rev) => {
      const x = allTasks.find((t) => t.id === taskId);
      if (!x) return;
      const hist = x.history ?? [];
      const targetRev = rev ?? activeRevisions[taskId] ?? revOf(x);
      const id = `r${Date.now()}`;
      let entry: TrashRevision;
      if (targetRev === revOf(x)) {
        const prev = hist[hist.length - 1];
        if (!prev) return;
        entry = { id, taskId, taskTitle: x.title, wasCurrent: true, deletedAt: now(), snap: snapshotOf(x, now().slice(0, 10)) };
        setTasks((ts) => ts.map((t) => t.id === taskId ? { ...applySnapshot(t, prev), history: hist.slice(0, -1) } : t));
      } else {
        const snap = hist.find((h) => h.rev === targetRev);
        if (!snap) return;
        entry = { id, taskId, taskTitle: x.title, wasCurrent: false, deletedAt: now(), snap };
        setTasks((ts) => ts.map((t) => t.id === taskId ? { ...t, history: hist.filter((h) => h !== snap) } : t));
      }
      setRevTrash((r) => [...r, entry]);
      setActiveRevisions((a) => { const next = { ...a }; delete next[taskId]; return next; });
      setUndoStack((u) => [...u, { kind: "revision", ...entry }]);
    },
    tasks, projects, companies, docTypes, filtered, filters, companyOf,
    addDocType: (code, label) => {
      const c = code.trim().toUpperCase(); const l = label.trim();
      if (!c || !l || DEFAULT_DOC_TYPES.some((d) => d.code === c)) return;
      setCustomDocTypes((ds) => [...ds.filter((d) => d.code !== c), { code: c, label: l }]);
    },
    setFilters: (f) => setF((p) => ({ ...p, ...f })),
    upsertTask: (task) => setTasks((ts) => (ts.some((x) => x.id === task.id) ? ts.map((x) => (x.id === task.id ? updateRevision(x, task) : x)) : [...ts, task])),
    deleteTask: (id) => {
      const x = allTasks.find((t) => t.id === id);
      if (!x) return;
      const d = now();
      setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, deletedAt: d } : t)));
      setUndoStack((u) => [...u, { kind: "card", id, title: x.title, rev: revOf(x), status: x.status, deletedAt: d }]);
    },
    moveTask: (id, status) => setTasks((ts) => ts.map((x) => x.id === id ? updateRevision(x, { ...selectRevision(x, activeRevisions[id]), status }) : x)),
    newRevision: (id, i) => {
      const existing = allTasks.find((x) => x.id === id);
      if (!existing || i.rev === revOf(existing) || existing.history?.some((h) => h.rev === i.rev)) return;
      setActiveRevisions((a) => ({ ...a, [id]: i.rev }));
      setTasks((ts) => ts.map((x) => {
      if (x.id !== id) return x;
      if (i.rev === revOf(x) || x.history?.some((h) => h.rev === i.rev)) return x;
      const snap = snapshotOf(x, new Date().toISOString().slice(0, 10));
      return { ...x, revision: i.rev, status: i.status, gedeUrl: i.gedeUrl, dueDate: i.dueDate, notes: i.note, checklist: [], history: [...(x.history ?? []), snap] };
      }));
    },
    swapRevision: (id, rev) => {
      const task = allTasks.find((x) => x.id === id);
      if (!task || (rev !== revOf(task) && !task.history?.some((h) => h.rev === rev))) return;
      setActiveRevisions((a) => ({ ...a, [id]: rev }));
    },
    toggleQualityRework: (id) => setTasks((ts) => ts.map((x) => {
      if (x.id !== id) return x;
      const selected = selectRevision(x, activeRevisions[id]);
      return updateRevision(x, { ...selected, qualityRework: selected.qualityRework ? 0 : 1 });
    })),
    updateChecklist: (id, fn) => setTasks((ts) => ts.map((x) => {
      if (x.id !== id) return x;
      const selected = selectRevision(x, activeRevisions[id]);
      return updateRevision(x, { ...selected, ...fn(selected) });
    })),
    addProject: (p) => setProjects((ps) => (ps.some((x) => x.code === p.code) ? ps : [...ps, p])),
    addCompany: (name) => {
      const existing = companies.find((c) => c.name.toLowerCase() === name.toLowerCase());
      if (existing) return existing.id;
      const id = `c${Date.now()}`;
      setCompanies((cs) => [...cs, { id, name }]);
      return id;
    },
    people,
    addPerson: (name, role) => {
      const p: Person = { id: `p${Date.now()}`, name: name.trim(), role: role.trim(), email: "" };
      setPeople((ps) => [...ps, p]);
      return p;
    },
  };
  undoRef.current = value._undoImpl;
  return <TasksContext.Provider value={value}>{children}</TasksContext.Provider>;
}

export function useTasks() {
  const c = useContext(TasksContext);
  if (!c) throw new Error("useTasks outside provider");
  return c;
}

let peopleState = PEOPLE;
export const registerPeople = (ps: Person[]) => { peopleState = ps; };
export const personById = (id: string) => peopleState.find((p) => p.id === id);
export const initials = (name: string) => name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
export const fmtDate = (d: string) => (d ? d.split("-").reverse().join("/") : "—");
let customDocTypesState: DocType[] = [];
export const registerDocTypes = (ds: DocType[]) => { customDocTypesState = ds; };
export const docLabel = (code: string) => DEFAULT_DOC_TYPES.find((d) => d.code === code)?.label ?? customDocTypesState.find((d) => d.code === code)?.label ?? "Tipo customizado";

export const daysUntil = (d: string) => {
  if (!d) return Infinity;
  const t = new Date(); t.setHours(0, 0, 0, 0);
  return Math.round((new Date(d + "T00:00:00").getTime() - t.getTime()) / 86400000);
};
export const isOverdue = (t: { dueDate: string; status: Status }) => t.status !== "Aprovado" && daysUntil(t.dueDate) < 0;
