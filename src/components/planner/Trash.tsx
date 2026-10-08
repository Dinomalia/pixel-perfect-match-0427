import { useEffect } from "react";
import { toast } from "sonner";
import { RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTasks, type TrashItem } from "@/lib/tasks";

export function toastDeleted(label: string, undo: () => void) {
  toast(label, { description: "Ctrl+Z para desfazer · também está na Lixeira", action: { label: "Desfazer", onClick: undo }, duration: 6000 });
}

export function useUndoShortcut() {
  const { undo, trash } = useTasks();
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.shiftKey || e.key.toLowerCase() !== "z") return;
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
      if (!trash.length) return;
      e.preventDefault();
      undo();
      toast.success("Exclusão desfeita");
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [undo, trash.length]);
}

const fmt = (iso: string) => new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

export function TrashView() {
  const { trash, restore, purge } = useTasks();
  const label = (i: TrashItem) => (i.kind === "card" ? i.title : i.taskTitle);
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-card">
      <h2 className="mb-1 flex items-center gap-2 text-lg font-semibold"><Trash2 className="h-5 w-5" />Lixeira</h2>
      <p className="mb-4 text-sm text-muted-foreground">Documentos e revisões excluídos ficam aqui até você restaurar ou excluir definitivamente.</p>
      {trash.length === 0 ? <p className="py-10 text-center text-sm text-muted-foreground">A lixeira está vazia.</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground"><tr className="border-b border-border"><th className="py-2 pr-4">Documento</th><th className="py-2 pr-4">Item</th><th className="py-2 pr-4">Revisão</th><th className="py-2 pr-4">Excluído em</th><th className="py-2 text-right">Ações</th></tr></thead>
            <tbody>
              {trash.map((i) => (
                <tr key={i.id} className="border-b border-border last:border-0">
                  <td className="py-3 pr-4 font-medium">{label(i)}</td>
                  <td className="py-3 pr-4 text-muted-foreground">{i.kind === "card" ? "Documento" : "Revisão"}</td>
                  <td className="py-3 pr-4">Rev. {i.kind === "card" ? i.rev : i.snap.rev}</td>
                  <td className="py-3 pr-4 text-muted-foreground">{fmt(i.deletedAt)}</td>
                  <td className="py-3 text-right">
                    <div className="inline-flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => { restore(i); toast.success("Restaurado"); }}><RotateCcw className="h-3.5 w-3.5" />Restaurar</Button>
                      <Button size="sm" variant="outline" className="text-destructive" onClick={() => { if (confirm("Excluir definitivamente? Isso não pode ser desfeito.")) purge(i); }}>Excluir definitivamente</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
