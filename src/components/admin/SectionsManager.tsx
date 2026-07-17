import { useState } from "react";
import { Plus, Check, X, Pencil, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { listSections, upsertSection, deleteSection, listDepartments } from "@/backend/functions/directory.functions";

export function SectionsManager() {
  const qc = useQueryClient();
  const fetchSections = useServerFn(listSections);
  const fetchDepartments = useServerFn(listDepartments);
  const mUpsertFn = useServerFn(upsertSection);
  const mDelFn = useServerFn(deleteSection);

  const { data: sections, isLoading } = useQuery({ queryKey: ["all-sections"], queryFn: () => fetchSections() });
  const { data: departments } = useQuery({ queryKey: ["departments"], queryFn: () => fetchDepartments() });

  const [draftId, setDraftId] = useState<string | null>(null);
  const [draft, setDraft] = useState({ name_en: "", name_ar: "", department_id: "", active: true });

  const mUpsert = useMutation({
    mutationFn: (data: any) => mUpsertFn({ data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["all-sections"] });
      toast.success("Section saved successfully");
      setDraftId(null);
      setDraft({ name_en: "", name_ar: "", department_id: "", active: true });
    },
    onError: (e: any) => toast.error(e.message)
  });

  const mDelete = useMutation({
    mutationFn: (id: string) => mDelFn({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["all-sections"] });
      toast.success("Section deleted");
    },
    onError: (e: any) => toast.error(e.message)
  });

  const inputCls = "w-full rounded-lg border border-border bg-card px-3 py-1.5 text-sm outline-none focus:border-brand";

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Sub-Sections</h2>
          <p className="text-sm text-muted-foreground">Manage sections and link them to their parent departments.</p>
        </div>
        {draftId !== "new" && (
          <button 
            onClick={() => { setDraftId("new"); setDraft({ name_en: "", name_ar: "", department_id: "", active: true }); }}
            className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground hover:bg-brand/90 transition-colors"
          >
            <Plus className="h-4 w-4" /> Add Section
          </button>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/40 font-medium text-muted-foreground">
            <tr>
              <th className="p-4 w-1/3">Section Name (EN / AR)</th>
              <th className="p-4 w-1/3">Department</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-end">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {draftId === "new" && (
              <tr className="bg-brand/5">
                <td className="p-4">
                  <div className="space-y-2">
                    <input autoFocus placeholder="Name (EN)" className={inputCls} value={draft.name_en} onChange={(e) => setDraft({ ...draft, name_en: e.target.value })} />
                    <input placeholder="Name (AR)" className={inputCls} value={draft.name_ar} onChange={(e) => setDraft({ ...draft, name_ar: e.target.value })} />
                  </div>
                </td>
                <td className="p-4 align-top">
                  <select className={inputCls} value={draft.department_id} onChange={(e) => setDraft({ ...draft, department_id: e.target.value })}>
                    <option value="">— Select Department —</option>
                    {(departments ?? []).map((d: any) => <option key={d.id} value={d.id}>{d.name_en}</option>)}
                  </select>
                </td>
                <td className="p-4 align-top">
                  <button onClick={() => setDraft({ ...draft, active: !draft.active })} className={`rounded-full px-2.5 py-1 text-xs font-semibold ${draft.active ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>
                    {draft.active ? "Active" : "Inactive"}
                  </button>
                </td>
                <td className="p-4 align-top text-end">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => {
                      if (!draft.name_en || !draft.department_id) return toast.error("Name and Department are required");
                      mUpsert.mutate(draft);
                    }} className="rounded-lg p-1.5 text-brand hover:bg-brand/10 bg-brand/5" title="Save">
                      <Check className="h-4 w-4" />
                    </button>
                    <button onClick={() => setDraftId(null)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted" title="Cancel">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            )}

            {isLoading ? (
              <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">Loading...</td></tr>
            ) : !sections || sections.length === 0 ? (
              draftId !== "new" && <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">No sections found.</td></tr>
            ) : (
              sections.map((s: any) => draftId === s.id ? (
                <tr key={s.id} className="bg-brand/5">
                  <td className="p-4">
                    <div className="space-y-2">
                      <input autoFocus placeholder="Name (EN)" className={inputCls} value={draft.name_en} onChange={(e) => setDraft({ ...draft, name_en: e.target.value })} />
                      <input placeholder="Name (AR)" className={inputCls} value={draft.name_ar} onChange={(e) => setDraft({ ...draft, name_ar: e.target.value })} />
                    </div>
                  </td>
                  <td className="p-4 align-top">
                    <select className={inputCls} value={draft.department_id} onChange={(e) => setDraft({ ...draft, department_id: e.target.value })}>
                      <option value="">— Select Department —</option>
                      {(departments ?? []).map((d: any) => <option key={d.id} value={d.id}>{d.name_en}</option>)}
                    </select>
                  </td>
                  <td className="p-4 align-top">
                    <button onClick={() => setDraft({ ...draft, active: !draft.active })} className={`rounded-full px-2.5 py-1 text-xs font-semibold ${draft.active ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>
                      {draft.active ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td className="p-4 align-top text-end">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => {
                        if (!draft.name_en || !draft.department_id) return toast.error("Name and Department are required");
                        mUpsert.mutate({ ...draft, id: s.id });
                      }} className="rounded-lg p-1.5 text-brand hover:bg-brand/10 bg-brand/5" title="Save">
                        <Check className="h-4 w-4" />
                      </button>
                      <button onClick={() => setDraftId(null)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted" title="Cancel">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr key={s.id} className="hover:bg-muted/30">
                  <td className="p-4">
                    <p className="font-semibold">{s.name_en}</p>
                    <p className="text-xs text-muted-foreground">{s.name_ar || "—"}</p>
                  </td>
                  <td className="p-4 text-muted-foreground">
                    {s.departments?.name_en || "—"}
                  </td>
                  <td className="p-4">
                    <button onClick={() => mUpsert.mutate({ ...s, active: !s.active })} className={`rounded-full px-2.5 py-1 text-xs font-semibold ${s.active ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>
                      {s.active ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td className="p-4 text-end">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => { setDraftId(s.id); setDraft({ name_en: s.name_en, name_ar: s.name_ar, department_id: s.department_id, active: s.active }); }} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted" title="Edit">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button onClick={() => { if (confirm("Delete section?")) mDelete.mutate(s.id); }} className="rounded-lg p-1.5 text-destructive hover:bg-destructive/10" title="Delete">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
