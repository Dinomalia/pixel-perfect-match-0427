import { useState } from "react";
import { Plus, SlidersHorizontal, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTasks } from "@/lib/tasks";

export function StageManagerDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { stages, addStage, updateStage, deleteStage } = useTasks();
  const [name, setName] = useState("");
  const [color, setColor] = useState("#0ea5e9");

  const create = () => {
    if (!name.trim()) { toast.error("Informe o nome da etapa"); return; }
    addStage(name.trim(), color);
    setName("");
    toast.success("Etapa adicionada!");
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><SlidersHorizontal className="h-4 w-4" />Etapas do Fluxo (Kanban & Cronograma)</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-[1fr_56px_auto] items-end gap-2">
            <div className="space-y-1.5">
              <Label>Nova etapa</Label>
              <Input placeholder="Ex.: Revisão Cliente" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} onKeyDown={(e) => { if (e.key === "Enter") create(); }} />
            </div>
            <div className="space-y-1.5">
              <Label>Cor</Label>
              <Input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-9 cursor-pointer p-1" />
            </div>
            <Button type="button" onClick={create}><Plus className="mr-1 h-4 w-4" />Adicionar</Button>
          </div>

          <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
            {stages.map((st) => (
              <div key={st.id} className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 p-2">
                <input
                  type="color"
                  value={st.color}
                  onChange={(e) => updateStage(st.id, { color: e.target.value })}
                  className="h-7 w-9 shrink-0 cursor-pointer rounded border border-border bg-transparent p-0.5"
                  aria-label={`Cor de ${st.name}`}
                />
                <Input
                  className="h-8 flex-1 text-sm"
                  value={st.name}
                  onChange={(e) => updateStage(st.id, { name: e.target.value })}
                  maxLength={40}
                />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 shrink-0 text-destructive"
                  disabled={stages.length <= 1}
                  onClick={() => {
                    if (window.confirm(`Remover a etapa "${st.name}"? Documentos nela serão movidos para a primeira etapa.`)) {
                      deleteStage(st.id);
                    }
                  }}
                  aria-label={`Remover ${st.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button type="button" onClick={onClose}>Concluir</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
