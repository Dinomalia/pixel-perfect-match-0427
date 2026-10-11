import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { selectRevision, updateRevision, TasksProvider, useTasks, type Task } from "@/lib/tasks";

const document: Task = {
  id: "revisions", title: "Documento", projectCode: "PRJ-1420", docType: "DE",
  revision: "B", status: "Qualidade", assignees: ["p1"], gedeUrl: "https://example.com/B",
  dueDate: "2026-10-20", priority: "Crítica", notes: "B", folderPath: "Z:\\B", qualityRework: 2,
  history: [
    { rev: "0", status: "Aprovado", assignees: [], gedeUrl: "https://example.com/0", dueDate: "2026-08-10", note: "Inicial", archivedAt: "2026-08-12" },
    { rev: "A", status: "Retrabalho", assignees: ["p2"], gedeUrl: "https://example.com/A", dueDate: "2026-09-15", note: "A", archivedAt: "2026-09-20", folderPath: "Z:\\A", qualityRework: 1 },
  ],
};

afterEach(() => { cleanup(); localStorage.clear(); });

describe("Revision integrity", () => {
  it("switches 0, A and B without altering any stored payload or archival date", () => {
    const before = structuredClone(document);
    for (const rev of ["0", "A", "B", "0", "B", "A"]) {
      const selected = selectRevision(document, rev);
      expect(selected.activeRevisionId).toBe(rev);
      expect([selected.revision, ...selected.history?.map((h) => h.rev) ?? []].sort()).toEqual(["0", "A", "B"]);
      expect(document).toEqual(before);
    }
  });

  it("loads every historical field including empty assignees without borrowing latest revision data", () => {
    const selected = selectRevision(document, "0");
    expect(selected).toMatchObject({ status: "Aprovado", assignees: [], gedeUrl: "https://example.com/0", dueDate: "2026-08-10", notes: "Inicial" });
    expect(selectRevision(document, "A")).toMatchObject({ folderPath: "Z:\\A", qualityRework: 1 });
  });

  it("saves an old revision independently and keeps the latest revision and other history intact", () => {
    const updated = updateRevision(document, { ...selectRevision(document, "A"), notes: "Editada", status: "Elaboração", folderPath: "Z:\\A-edit" });
    expect({ ...updated, history: undefined }).toEqual({ ...document, history: undefined });
    expect(updated.history?.[0]).toEqual(document.history?.[0]);
    expect(updated.history?.[1]).toMatchObject({ rev: "A", note: "Editada", status: "Elaboração", archivedAt: "2026-09-20", folderPath: "Z:\\A-edit" });
  });

  it("provider selection never writes revision changes to persistence, and edits affect only the selected revision", async () => {
    const { result } = renderHook(() => useTasks(), { wrapper: TasksProvider });
    await waitFor(() => expect(localStorage.getItem("planner-bi-v2")).not.toBeNull());
    const before = localStorage.getItem("planner-bi-v2");
    for (const rev of ["0", "A", "B", "0"]) {
      act(() => result.current.swapRevision("t2", rev));
      expect(result.current.tasks.find((t) => t.id === "t2")?.revision).toBe(rev);
      expect(localStorage.getItem("planner-bi-v2")).toBe(before);
    }
    act(() => result.current.moveTask("t2", "Elaboração"));
    act(() => result.current.swapRevision("t2", "B"));
    expect(result.current.tasks.find((t) => t.id === "t2")?.status).toBe("Qualidade");
    act(() => result.current.swapRevision("t2", "0"));
    expect(result.current.tasks.find((t) => t.id === "t2")?.status).toBe("Elaboração");
  });

  it("explicit deletion removes only the selected old version and undo restores it", () => {
    const { result } = renderHook(() => useTasks(), { wrapper: TasksProvider });
    act(() => result.current.swapRevision("t2", "0"));
    act(() => result.current.deleteRevision("t2", null));
    expect(result.current.tasks.find((t) => t.id === "t2")?.revision).toBe("B");
    expect(result.current.trash[0]).toMatchObject({ kind: "revision", snap: { rev: "0" } });
    act(() => result.current.undo());
    expect(result.current.tasks.find((t) => t.id === "t2")?.history?.map((h) => h.rev)).toEqual(["0", "A"]);
  });
});