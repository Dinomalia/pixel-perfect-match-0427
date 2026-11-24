import { supabase } from "@/integrations/supabase/client";

const STATE_ID = "default";
const TABLE = "planner_state";

export type CloudPlannerPayload = {
  tasks?: unknown[];
  projects?: unknown[];
  companies?: unknown[];
  revTrash?: unknown[];
  people?: unknown[];
  customDocTypes?: unknown[];
};

type PlannerRow = {
  id: string;
  data: CloudPlannerPayload | null;
  updated_at: string;
};

type UntypedTable = {
  select: (cols: string) => {
    eq: (col: string, val: string) => {
      maybeSingle: () => Promise<{ data: PlannerRow | null; error: { message: string } | null }>;
    };
  };
  upsert: (row: PlannerRow, opts?: { onConflict?: string }) => Promise<{ error: { message: string } | null }>;
};

const table = () => (supabase as unknown as { from: (name: string) => UntypedTable }).from(TABLE);

export async function loadCloudState(): Promise<{ data: CloudPlannerPayload | null; error: string | null }> {
  try {
    const { data, error } = await table().select("id, data, updated_at").eq("id", STATE_ID).maybeSingle();
    if (error) return { data: null, error: error.message };
    return { data: data?.data ?? null, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "Erro ao carregar da nuvem" };
  }
}

export async function saveCloudState(payload: CloudPlannerPayload): Promise<{ error: string | null }> {
  try {
    const { error } = await table().upsert(
      { id: STATE_ID, data: payload, updated_at: new Date().toISOString() },
      { onConflict: "id" },
    );
    return { error: error ? error.message : null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erro ao salvar na nuvem" };
  }
}
