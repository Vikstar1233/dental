import { addNote } from "@/lib/actions/patients";

type Note = { id: string; body: string; created_at: string };

export function NotesPanel({
  patientId,
  notes,
  redirectTo,
}: {
  patientId: string;
  notes: Note[];
  redirectTo: string;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {notes.map((note) => (
          <div
            key={note.id}
            className="rounded-lg border border-[var(--line)] bg-[var(--porcelain)] px-3 py-2 text-sm"
          >
            <p className="text-[var(--ink)]">{note.body}</p>
            <p className="mt-1 font-data text-xs text-[var(--muted)]">
              {new Date(note.created_at).toLocaleString()}
            </p>
          </div>
        ))}
        {notes.length === 0 && (
          <p className="text-sm text-[var(--muted)]">No notes yet.</p>
        )}
      </div>

      <form action={addNote} className="space-y-2">
        <input type="hidden" name="patient_id" value={patientId} />
        <input type="hidden" name="redirect_to" value={redirectTo} />
        <textarea
          name="body"
          required
          rows={2}
          placeholder="Add a note"
          className="block w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink)] focus:border-[var(--teal)] focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-sm font-medium text-[var(--ink)] hover:bg-[var(--porcelain)]"
        >
          Add note
        </button>
      </form>
    </div>
  );
}
