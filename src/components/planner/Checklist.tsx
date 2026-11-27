import { useState } from "react";
import { CheckCircle2, Circle, Trash2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useTasks, type Task } from "@/lib/tasks";
import { cn } from "@/lib/utils";

const uid = () => Math.random().toString(36).slice(2, 10);

function ItemToggle({ done, onClick, label }: { done: boolean; onClick: () => void; label: string }) {
  return (
    <button type="button" aria-label={label} aria-pressed={done} onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={cn("shrink-0", done ? "text-primary" : "text-muted-foreground hover:text-primary")}>
      {done ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
    </button>
  );
}

export function ChecklistEditor({ task }: { task: Task }) {
  const { updateChecklist } = useTasks();
  const [text, setText] = useState("");
  const items = task.checklist ?? [];
  const done = items.filter((i) => i.done).length;
  const add = () => {
    const v = text.trim();
    if (!v) return;
    updateChecklist(task.id, (t) => ({ checklist: [...(t.checklist ?? []), { id: uid(), text: v, done: false }] }));
    setText("");
  };
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold">Lista de verificação ({done} de {items.length} itens concluídos)</span>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <Checkbox checked={!!task.showChecklistOnCard} onCheckedChange={(c) => updateChecklist(task.id, () => ({ showChecklistOnCard: c === true }))} />
          Mostrar na visualização de quadro
        </label>
      </div>
      <ul className="space-y-1">
        {items.map((i) => (
          <li key={i.id} className="group flex items-center gap-2 text-sm">
            <ItemToggle done={i.done} label={`Concluir ${i.text}`} onClick={() => updateChecklist(task.id, (t) => ({ checklist: (t.checklist ?? []).map((c) => c.id === i.id ? { ...c, done: !c.done } : c) }))} />
            <span className={cn("flex-1", i.done && "text-muted-foreground line-through")}>{i.text}</span>
            <button type="button" aria-label={`Remover ${i.text}`} title="Excluir item" className="rounded p-1 text-muted-foreground/60 transition-colors hover:bg-destructive/10 hover:text-destructive"
              onClick={() => updateChecklist(task.id, (t) => ({ checklist: (t.checklist ?? []).filter((c) => c.id !== i.id) }))}><Trash2 className="h-3.5 w-3.5" /></button>
          </li>
        ))}
        <li className="flex items-center gap-2 text-sm">
          <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }} onBlur={add}
            placeholder="Adicionar um item" className="flex-1 bg-transparent py-1 outline-none placeholder:text-muted-foreground" />
        </li>
      </ul>
    </div>
  );
}

export function CardChecklist({ task }: { task: Task }) {
  const { updateChecklist } = useTasks();
  const items = task.checklist ?? [];
  if (!items.length) return null;
  const done = items.filter((i) => i.done).length;
  if (!task.showChecklistOnCard) {
    return <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><CheckCircle2 className="h-3.5 w-3.5" />{done}/{items.length}</span>;
  }
  return (
    <ul className="space-y-1" onClick={(e) => e.stopPropagation()}>
      {items.map((i) => (
        <li key={i.id} className="flex items-start gap-1.5 text-xs">
          <ItemToggle done={i.done} label={`Concluir ${i.text}`} onClick={() => updateChecklist(task.id, (t) => ({ checklist: (t.checklist ?? []).map((c) => c.id === i.id ? { ...c, done: !c.done } : c) }))} />
          <span className={cn("leading-4", i.done && "text-muted-foreground line-through")}>{i.text}</span>
        </li>
      ))}
    </ul>
  );
}
