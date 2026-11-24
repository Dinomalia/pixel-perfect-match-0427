import * as XLSX from "xlsx";
import { docLabel, fmtDate, personById, revOf, type Company, type Project, type Task } from "./tasks";

export function exportKanbanToExcel(
  tasks: Task[],
  projects: Project[],
  companyOf: (projectCode: string) => Company | undefined,
): void {
  const rows = tasks.map((t) => {
    const proj = projects.find((p) => p.code === t.projectCode);
    const comp = companyOf(t.projectCode);
    const assignees = t.assignees.map((id) => personById(id)?.name ?? id).join(", ");
    return {
      Empresa: comp?.name ?? "",
      Projeto: proj ? `${proj.code} — ${proj.name}` : t.projectCode,
      Tipo: `${t.docType} — ${docLabel(t.docType)}`,
      Título: t.title,
      Revisão: revOf(t),
      Status: t.status,
      Prioridade: t.priority,
      Prazo: fmtDate(t.dueDate),
      Colaboradores: assignees,
      "Retrabalho Qualidade": t.qualityRework ?? 0,
      "Motivo Retrabalho": t.qualityReworkNote ?? "",
      "Link GED": t.gedeUrl,
      "Pasta de Rede": t.folderPath ?? "",
      Observações: t.notes,
    };
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = [
    { wch: 16 },
    { wch: 30 },
    { wch: 24 },
    { wch: 40 },
    { wch: 10 },
    { wch: 16 },
    { wch: 12 },
    { wch: 12 },
    { wch: 28 },
    { wch: 20 },
    { wch: 30 },
    { wch: 36 },
    { wch: 32 },
    { wch: 40 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Kanban");
  const date = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `kanban-${date}.xlsx`);
}
