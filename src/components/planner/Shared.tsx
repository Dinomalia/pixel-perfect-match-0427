import { AlertTriangle, CalendarDays, ChevronDown, ExternalLink, FolderOpen } from "lucide-react";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { PRIORITY_STYLE, STATUS_STYLE, daysUntil, fmtDate, getStageColor, getStatusStyle, initials, isNetPath, personById, useTasks, type Priority, type Status, type Task } from "@/lib/tasks";

export function StatusBadge({ status }: { status: Status }) {
  const { stages } = useTasks();
  const st = getStatusStyle(status, stages);
  const customColor = !STATUS_STYLE[status] ? getStageColor(status, stages) : undefined;
  return (
    <Badge variant="outline" className={cn("gap-1.5 font-medium", st.badge)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", !customColor && st.dot)} style={customColor ? { backgroundColor: customColor } : undefined} />
      {status}
    </Badge>
  );
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  return <Badge variant="outline" className={cn("font-medium", PRIORITY_STYLE[priority])}>{priority}</Badge>;
}

export function Avatars({ ids, size = "sm" }: { ids: string[]; size?: "sm" | "md" }) {
  return (
    <div className="flex -space-x-2">
      {ids.map((id) => {
        const p = personById(id);
        if (!p) return null;
        return (
          <Tooltip key={id}>
            <TooltipTrigger asChild>
              <span className={cn("grid shrink-0 place-items-center rounded-full border-2 border-card bg-primary font-semibold text-primary-foreground", size === "sm" ? "h-7 w-7 text-[10px]" : "h-8 w-8 text-xs")}>
                {initials(p.name)}
              </span>
            </TooltipTrigger>
            <TooltipContent><p className="font-medium">{p.name}</p><p className="text-xs opacity-80">{p.role}</p><p className="text-xs opacity-60">{p.email}</p></TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}

export async function copyPath(v: string, msg = "Caminho copiado!") {
  try { await navigator.clipboard.writeText(v); toast.success(msg); } catch { toast.error("Não foi possível copiar"); }
}

export function FolderCopy({ path }: { path?: string | undefined }) {
  if (!path) return null;
  return (
    <button type="button" title={`Copiar caminho da pasta: ${path}`} aria-label="Copiar caminho da pasta" onClick={(e) => { e.stopPropagation(); copyPath(path); }}
      className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs font-medium text-primary transition-colors hover:bg-accent"><FolderOpen className="h-3 w-3" />Pasta</button>
  );
}

export function GedeLink({ url }: { url: string }) {
  if (!url) return null;
  if (isNetPath(url)) return <FolderCopy path={url} />;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
      className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs font-medium text-primary transition-colors hover:bg-accent">
      <ExternalLink className="h-3 w-3" /> GED
    </a>
  );
}

export function DocTypeBadge({ type }: { type: string }) {
  return <span className="inline-flex items-center rounded bg-navy px-1.5 py-0.5 font-mono text-[11px] font-semibold tracking-wider text-navy-foreground">[{type || "—"}]</span>;
}

export function StatusSelect({ task }: { task: Task }) {
  const { moveTask, stages } = useTasks();
  const curStyle = getStatusStyle(task.status, stages);
  const curCustom = !STATUS_STYLE[task.status] ? getStageColor(task.status, stages) : undefined;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
        <button type="button" className={cn("inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium transition hover:opacity-80", curStyle.badge)}>
          <span className={cn("h-1.5 w-1.5 rounded-full", !curCustom && curStyle.dot)} style={curCustom ? { backgroundColor: curCustom } : undefined} />
          {task.status}<ChevronDown className="h-3 w-3" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent onClick={(e) => e.stopPropagation()}>
        {stages.map((s) => {
          const st = getStatusStyle(s.name, stages);
          const custom = !STATUS_STYLE[s.name] ? s.color : undefined;
          return (
            <DropdownMenuItem key={s.id} onSelect={(e) => { e.stopPropagation(); moveTask(task.id, s.name); }} className="gap-2">
              <span className={cn("h-2 w-2 rounded-full", !custom && st.dot)} style={custom ? { backgroundColor: custom } : undefined} />{s.name}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function DueDate({ task }: { task: Task }) {
  const d = daysUntil(task.dueDate);
  const late = task.status !== "Aprovado" && d < 0;
  const soon = task.status !== "Aprovado" && d >= 0 && d <= 7;
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs", late ? "font-semibold text-destructive" : soon ? "font-medium text-status-draft-foreground" : "text-muted-foreground")}
      title={late ? `Atrasado ${-d} dia(s)` : soon ? `Vence em ${d} dia(s)` : undefined}>
      {late ? <AlertTriangle className="h-3 w-3" /> : <CalendarDays className="h-3 w-3" />}{fmtDate(task.dueDate)}
    </span>
  );
}
