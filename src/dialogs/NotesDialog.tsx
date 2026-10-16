import { useApp } from '../app/context.ts';

/** The encounter's notes, saved as you type (one undo step per pause). */
export function NotesDialog({ onDone }: { onDone: () => void }) {
  const { encounter, patchEncounter } = useApp();
  return (
    <>
      <textarea
        class="notes-editor"
        aria-label="Encounter notes"
        value={encounter.notes}
        onInput={(e) => {
          const notes = e.currentTarget.value;
          patchEncounter('Notes edit', (enc) => ({ ...enc, notes }), { key: `notes:${encounter.id}` });
        }}
        placeholder="Tactics, location, objectives, consequences…"
      />
      <div class="modal-bottom">
        <span>Saved automatically</span>
        <button class="solid" onClick={onDone}>
          Done
        </button>
      </div>
    </>
  );
}
