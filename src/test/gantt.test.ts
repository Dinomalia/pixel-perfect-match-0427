import { describe, expect, it } from "vitest";
import { allocationConflicts } from "@/lib/timeline";
import type { Task } from "@/lib/tasks";
const t = (id: string, due: string, a: string[]) => ({ id, title: id, projectCode: "P", docType: "DE", gedeUrl: "", assignees: a, dueDate: due, status: "Elaboração", priority: "Média", notes: "" }) as Task;
describe("allocationConflicts", () => {
  it("flags same person with overlapping periods", () => {
    const c = allocationConflicts([t("a", "2026-12-10", ["p1"]), t("b", "2026-12-15", ["p1"])], () => "Ana");
    expect([...(c.get("a") ?? [])]).toEqual(["Ana"]);
  });
  it("ignores different people or distant periods", () => {
    expect(allocationConflicts([t("a", "2026-12-10", ["p1"]), t("b", "2026-12-10", ["p2"])], () => "x").size).toBe(0);
    expect(allocationConflicts([t("a", "2026-12-01", ["p1"]), t("b", "2026-12-30", ["p1"])], () => "x").size).toBe(0);
  });
});
