import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Plus, Package, Trash2, Loader2, X } from "lucide-react";
import {
  listEmployeeCustody,
  addEmployeeCustody,
  deleteEmployeeCustody,
  CUSTODY_CATEGORIES,
  type CustodyItem,
} from "@/backend/functions/custody.functions";

const inputCls = "w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm";
const today = () => new Date().toISOString().slice(0, 10);

export function EmployeeCustodyPanel({ employeeId }: { employeeId: string }) {
  const qc = useQueryClient();
  const listFn = useServerFn(listEmployeeCustody);
  const addFn = useServerFn(addEmployeeCustody);
  const delFn = useServerFn(deleteEmployeeCustody);
  const [open, setOpen] = useState(false);

  const q = useQuery({
    queryKey: ["employee-custody", employeeId],
    queryFn: () => listFn({ data: { profileId: employeeId } }),
  });

  const addMut = useMutation({
    mutationFn: (v: any) => addFn({ data: { profileId: employeeId, ...v } }),
    onSuccess: () => {
      toast.success("Custody item added");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["employee-custody", employeeId] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to add"),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["employee-custody", employeeId] }),
    onError: (e: any) => toast.error(e?.message ?? "Failed to delete"),
  });

  const items = (q.data ?? []) as CustodyItem[];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold">Custody</h2>
          <p className="text-sm text-muted-foreground">Assets and equipment assigned to this employee.</p>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-full bg-gradient-brand px-4 py-2 text-sm font-semibold text-brand-foreground shadow-brand"
        >
          <Plus className="h-4 w-4" /> Add custody
        </button>
      </div>

      <div className="overflow-hidden rounded-3xl border border-border bg-card">
        {q.isLoading ? (
          <div className="grid place-items-center py-10 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="grid place-items-center gap-2 py-12 text-center text-sm text-muted-foreground">
            <Package className="h-6 w-6" />
            No custody items yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-start">Date</th>
                  <th className="px-4 py-3 text-start">Name</th>
                  <th className="px-4 py-3 text-start">Serial number</th>
                  <th className="px-4 py-3 text-start">Model</th>
                  <th className="px-4 py-3 text-start">Category</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((it) => (
                  <tr key={it.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono text-xs">{it.custody_date}</td>
                    <td className="px-4 py-3 font-medium">{it.name}</td>
                    <td className="px-4 py-3 font-mono text-xs">{it.serial_number ?? "—"}</td>
                    <td className="px-4 py-3">{it.model ?? "—"}</td>
                    <td className="px-4 py-3">
                      {it.category ? (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold">{it.category}</span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 text-end">
                      <button
                        disabled={delMut.isPending}
                        onClick={() => {
                          if (confirm(`Remove "${it.name}" from custody?`)) delMut.mutate(it.id);
                        }}
                        className="rounded-full p-2 text-destructive hover:bg-destructive/10 disabled:opacity-50"
                        aria-label="Delete custody item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {open && <AddCustodyModal onClose={() => setOpen(false)} onSubmit={(v) => addMut.mutate(v)} pending={addMut.isPending} />}
    </div>
  );
}

function AddCustodyModal({
  onClose,
  onSubmit,
  pending,
}: {
  onClose: () => void;
  onSubmit: (v: any) => void;
  pending: boolean;
}) {
  const [form, setForm] = useState({
    custody_date: today(),
    name: "",
    serial_number: "",
    model: "",
    category: "",
    notes: "",
  });
  const upd = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-3xl border border-border bg-card p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold">Add custody item</h3>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-muted" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!form.name.trim()) return toast.error("Name is required");
            onSubmit(form);
          }}
        >
          <label className="space-y-1 text-sm">
            <span className="text-xs font-semibold text-muted-foreground">Date</span>
            <input type="date" value={form.custody_date} onChange={(e) => upd("custody_date", e.target.value)} className={inputCls} />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-xs font-semibold text-muted-foreground">Name</span>
            <input value={form.name} onChange={(e) => upd("name", e.target.value)} placeholder="Dell Latitude laptop" className={inputCls} />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-xs font-semibold text-muted-foreground">Serial number</span>
            <input value={form.serial_number} onChange={(e) => upd("serial_number", e.target.value)} className={inputCls + " font-mono"} />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-xs font-semibold text-muted-foreground">Model</span>
            <input value={form.model} onChange={(e) => upd("model", e.target.value)} className={inputCls} />
          </label>
          <label className="space-y-1 text-sm sm:col-span-2">
            <span className="text-xs font-semibold text-muted-foreground">Category</span>
            <select value={form.category} onChange={(e) => upd("category", e.target.value)} className={inputCls}>
              <option value="">—</option>
              {CUSTODY_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm sm:col-span-2">
            <span className="text-xs font-semibold text-muted-foreground">Notes</span>
            <textarea value={form.notes} onChange={(e) => upd("notes", e.target.value)} rows={2} className={inputCls} />
          </label>
          <div className="sm:col-span-2 mt-1 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-full border border-border px-4 py-2 text-sm font-semibold">
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-brand px-4 py-2 text-sm font-semibold text-brand-foreground shadow-brand disabled:opacity-50"
            >
              {pending && <Loader2 className="h-4 w-4 animate-spin" />} Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
