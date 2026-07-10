import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Trash2, StickyNote as StickyNoteIcon, Save, Check } from "lucide-react";
import { toast } from "sonner";
import {
  listStickyNotes,
  createStickyNote,
  updateStickyNote,
  deleteStickyNote,
  STICKY_COLORS,
  type StickyNote,
} from "@/backend/functions/sticky-notes.functions";

export const Route = createFileRoute("/admin/sticky-notes")({
  component: StickyNotesPage,
});

const COLOR_LABELS: Record<string, string> = {
  "bg-yellow-200": "Yellow",
  "bg-pink-200": "Pink",
  "bg-green-200": "Green",
  "bg-blue-200": "Blue",
  "bg-purple-200": "Purple",
  "bg-orange-200": "Orange",
};

function StickyNotesPage() {
  const listFn = useServerFn(listStickyNotes);
  const createFn = useServerFn(createStickyNote);
  const updateFn = useServerFn(updateStickyNote);
  const deleteFn = useServerFn(deleteStickyNote);

  const [notes, setNotes] = useState<StickyNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await listFn();
      setNotes(rows);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(msg.includes("sticky_notes")
        ? "Run docs/migrations/sticky-notes.sql to create the table."
        : msg);
    } finally {
      setLoading(false);
    }
  }, [listFn]);

  useEffect(() => { void refresh(); }, [refresh]);

  const addNote = async (color: string) => {
    try {
      const row = await createFn({ data: { color, title: "", content: "" } });
      setNotes((prev) => [row, ...prev]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  const patchLocal = (id: string, patch: Partial<StickyNote>) =>
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, ...patch } : n)));

  const saveNote = async (n: StickyNote) => {
    try {
      await updateFn({ data: { id: n.id, title: n.title ?? "", content: n.content ?? "", color: n.color as (typeof STICKY_COLORS)[number] } });
      toast.success("Saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  const removeNote = async (id: string) => {
    const prev = notes;
    setNotes((p) => p.filter((n) => n.id !== id));
    try {
      await deleteFn({ data: { id } });
    } catch (err) {
      setNotes(prev);
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  const visible = useMemo(
    () => (filter === "all" ? notes : notes.filter((n) => n.color === filter)),
    [notes, filter],
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">Sticky Notes</h1>
          <p className="text-sm text-muted-foreground">Personal quick notes. Only you can see them.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">New:</span>
          {STICKY_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => addNote(c)}
              title={`Add ${COLOR_LABELS[c] ?? c} note`}
              className={`h-8 w-8 rounded-full border border-border shadow-sm transition hover:scale-110 ${c}`}
            />
          ))}
          <button
            onClick={() => addNote("bg-yellow-200")}
            className="inline-flex items-center gap-1.5 rounded-full bg-gradient-brand px-3.5 py-2 text-sm font-semibold text-brand-foreground shadow-brand"
          >
            <Plus className="h-4 w-4" /> New
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <FilterChip active={filter === "all"} onClick={() => setFilter("all")} label={`All (${notes.length})`} swatch={null} />
        {STICKY_COLORS.map((c) => {
          const count = notes.filter((n) => n.color === c).length;
          return (
            <FilterChip
              key={c}
              active={filter === c}
              onClick={() => setFilter(c)}
              label={`${COLOR_LABELS[c] ?? c} (${count})`}
              swatch={c}
            />
          );
        })}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : visible.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border bg-card p-10 text-center">
          <StickyNoteIcon className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">
            No notes yet. Pick a color above to add one.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visible.map((n) => (
            <NoteCard
              key={n.id}
              note={n}
              onChange={(patch) => patchLocal(n.id, patch)}
              onSave={() => saveNote(n)}
              onDelete={() => removeNote(n.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterChip({
  active, onClick, label, swatch,
}: { active: boolean; onClick: () => void; label: string; swatch: string | null }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
        active ? "border-brand bg-brand text-brand-foreground" : "border-border bg-card hover:bg-muted"
      }`}
    >
      {swatch && <span className={`h-3 w-3 rounded-full border border-border ${swatch}`} />}
      {label}
    </button>
  );
}

function NoteCard({
  note, onChange, onSave, onDelete,
}: {
  note: StickyNote;
  onChange: (patch: Partial<StickyNote>) => void;
  onSave: () => void;
  onDelete: () => void;
}) {
  const [confirmDel, setConfirmDel] = useState(false);
  return (
    <div className={`flex flex-col rounded-2xl p-4 shadow-sm ring-1 ring-black/5 ${note.color} text-slate-900`}>
      <input
        value={note.title ?? ""}
        onChange={(e) => onChange({ title: e.target.value })}
        placeholder="Title"
        className="w-full bg-transparent text-base font-semibold placeholder:text-slate-600/60 focus:outline-none"
      />
      <textarea
        value={note.content ?? ""}
        onChange={(e) => onChange({ content: e.target.value })}
        placeholder="Write something…"
        rows={6}
        className="mt-2 w-full flex-1 resize-none bg-transparent text-sm leading-relaxed placeholder:text-slate-600/60 focus:outline-none"
      />
      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          {STICKY_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => onChange({ color: c })}
              title={COLOR_LABELS[c] ?? c}
              className={`h-5 w-5 rounded-full border border-black/10 ${c} ${
                note.color === c ? "ring-2 ring-slate-900/60" : ""
              }`}
            />
          ))}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onSave}
            className="inline-flex items-center gap-1 rounded-full bg-slate-900/10 px-2.5 py-1 text-xs font-medium hover:bg-slate-900/20"
          >
            <Save className="h-3.5 w-3.5" /> Save
          </button>
          {confirmDel ? (
            <button
              onClick={onDelete}
              className="inline-flex items-center gap-1 rounded-full bg-red-600 px-2.5 py-1 text-xs font-semibold text-white"
            >
              <Check className="h-3.5 w-3.5" /> Confirm
            </button>
          ) : (
            <button
              onClick={() => { setConfirmDel(true); setTimeout(() => setConfirmDel(false), 3000); }}
              className="inline-flex items-center gap-1 rounded-full bg-slate-900/10 px-2.5 py-1 text-xs font-medium hover:bg-red-500/20"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
      <div className="mt-2 text-[10px] text-slate-700/70">
        Updated {new Date(note.updated_at).toLocaleString()}
      </div>
    </div>
  );
}