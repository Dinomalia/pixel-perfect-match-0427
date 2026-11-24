import { useState, type FormEvent } from "react";
import { Eye, EyeOff, KanbanSquare, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { verifyPlannerPassword } from "@/lib/api/planner.functions";

const AUTH_KEY = "projecthub-auth-v2";

export function isAuthenticated(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return !!sessionStorage.getItem(AUTH_KEY);
  } catch {
    return false;
  }
}

export function getSessionPassword(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem(AUTH_KEY);
  } catch {
    return null;
  }
}

export function clearAuthentication(): void {
  try {
    sessionStorage.removeItem(AUTH_KEY);
  } catch {}
}

export function LoginScreen({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    let ok = false;
    try {
      ok = (await verifyPlannerPassword({ data: { password } })).ok;
    } catch {
      setError("Não foi possível verificar a senha.");
      return;
    }
    if (ok) {
      try {
        sessionStorage.setItem(AUTH_KEY, password);
      } catch {}
      setError("");
      onSuccess();
      return;
    }
    setError("Senha incorreta. Tente novamente.");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm overflow-hidden rounded-xl border border-border bg-card shadow-lg">
        <div className="bg-navy px-6 py-5 text-navy-foreground">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-navy-foreground/10">
              <KanbanSquare className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight">ProjectHub</h1>
              <p className="text-xs opacity-75">Gestão de tarefas e projetos</p>
            </div>
          </div>
        </div>
        <form onSubmit={submit} className="space-y-4 p-6">
          <div className="space-y-1">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <Lock className="h-4 w-4 text-muted-foreground" />
              Acesso restrito
            </h2>
            <p className="text-xs text-muted-foreground">Informe a senha para acessar o painel.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="login-password">Senha</Label>
            <div className="relative">
              <Input
                id="login-password"
                type={show ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError("");
                }}
                placeholder="Digite a senha"
                autoFocus
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                aria-label={show ? "Ocultar senha" : "Mostrar senha"}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
              >
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {error && <p className="text-xs font-medium text-destructive">{error}</p>}
          </div>
          <Button type="submit" className="w-full">
            Entrar
          </Button>
        </form>
      </div>
    </div>
  );
}
