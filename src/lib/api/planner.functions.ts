import { createServerFn } from "@tanstack/react-start";

const STATE_ID = "default";
// Shared team password, checked only on the server (prefers env var when set).
const TEAM_PASSWORD = process.env["PLANNER_TEAM_PASSWORD"] || "galhofraco";

type Input = { password: string };
const validatePassword = (d: unknown): Input => {
  const p = (d as { password?: unknown })?.password;
  if (typeof p !== "string" || p.length > 200) throw new Error("Invalid input");
  return { password: p };
};
const assertPassword = (p: string) => {
  if (p !== TEAM_PASSWORD) throw new Error("Unauthorized");
};

export const verifyPlannerPassword = createServerFn({ method: "POST" })
  .inputValidator(validatePassword)
  .handler(async ({ data }) => ({ ok: data.password === TEAM_PASSWORD }));

export const loadPlannerState = createServerFn({ method: "POST" })
  .inputValidator(validatePassword)
  .handler(async ({ data }) => {
    assertPassword(data.password);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("planner_state").select("data").eq("id", STATE_ID).maybeSingle();
    if (error) throw new Error("Falha ao carregar");
    return { json: row?.data == null ? null : JSON.stringify(row.data) };
  });

export const savePlannerState = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => {
    const { password } = validatePassword(d);
    const payload = (d as { payload?: unknown }).payload;
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new Error("Invalid input");
    if (JSON.stringify(payload).length > 5_000_000) throw new Error("Payload too large");
    return { password, payload: payload as Record<string, unknown> };
  })
  .handler(async ({ data }) => {
    assertPassword(data.password);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("planner_state").upsert(
      { id: STATE_ID, data: data.payload as never, updated_at: new Date().toISOString() },
      { onConflict: "id" },
    );
    if (error) throw new Error("Falha ao salvar");
    return { ok: true };
  });
