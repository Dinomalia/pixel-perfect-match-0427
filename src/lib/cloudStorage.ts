import { loadPlannerState, savePlannerState } from "@/lib/api/planner.functions";
import { getSessionPassword } from "@/components/planner/LoginScreen";

export type CloudPlannerPayload = {
  tasks?: unknown[];
  projects?: unknown[];
  companies?: unknown[];
  revTrash?: unknown[];
  people?: unknown[];
  customDocTypes?: unknown[];
};

export async function loadCloudState(): Promise<{ data: CloudPlannerPayload | null; error: string | null }> {
  const password = getSessionPassword();
  if (!password) return { data: null, error: "Não autenticado" };
  try {
    const res = await loadPlannerState({ data: { password } });
    return { data: (res.data as CloudPlannerPayload | null) ?? null, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "Erro ao carregar da nuvem" };
  }
}

export async function saveCloudState(payload: CloudPlannerPayload): Promise<{ error: string | null }> {
  const password = getSessionPassword();
  if (!password) return { error: "Não autenticado" };
  try {
    await savePlannerState({ data: { password, payload } });
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erro ao salvar na nuvem" };
  }
}
