import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { initials, useTasks } from "@/lib/tasks";

export function AddPersonDialog({ open, onClose, onAdded }: { open: boolean; onClose: () => void; onAdded: (id: string) => void }) {
  const { addPerson } = useTasks();
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const close = () => { setName(""); setRole(""); onClose(); };
  const save = () => {
    if (!name.trim()) return;
    const p = addPerson(name, role);
    onAdded(p.id);
    toast.success(`${p.name} adicionado(a)`);
    close();
  };
  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Adicionar colaborador</DialogTitle></DialogHeader>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save(); }}>
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">{name.trim() ? initials(name) : "?"}</span>
            <div className="flex-1 space-y-1.5"><Label htmlFor="np-name">Nome completo</Label><Input id="np-name" autoFocus placeholder="Carlos Rocha" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} /></div>
          </div>
          <div className="space-y-1.5"><Label htmlFor="np-role">Cargo / Disciplina</Label><Input id="np-role" placeholder="Engenheiro de Tubulação" value={role} maxLength={80} onChange={(e) => setRole(e.target.value)} /></div>
          <DialogFooter><Button type="button" variant="outline" onClick={close}>Cancelar</Button><Button type="submit" disabled={!name.trim()}>Salvar</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
