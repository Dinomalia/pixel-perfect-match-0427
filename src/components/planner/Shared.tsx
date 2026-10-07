import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { PRIORITY_STYLE, STATUS_STYLE, initials, personById, type Priority, type Status } from "@/lib/tasks";

export function StatusBadge({ status }: { status: Status }) {
  return (
    <Badge variant="outline" className={cn("gap-1.5 font-medium", STATUS_STYLE[status].badge)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_STYLE[status].dot)} />
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
            <TooltipContent><p className="font-medium">{p.name}</p><p className="text-xs opacity-80">{p.email}</p></TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}

export function GedeLink({ url }: { url: string }) {
  if (!url) return null;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
      className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs font-medium text-primary transition-colors hover:bg-accent">
      <ExternalLink className="h-3 w-3" /> GEDE
    </a>
  );
}
