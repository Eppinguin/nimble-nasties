import { Anvil, Link2, Pencil, Plus, Trash2 } from 'lucide-preact';
import type { Monster } from '../lib/types.ts';
import { plural } from '../lib/summons.ts';
import { Statline } from '../components/Statline.tsx';
import { Statblock } from '../components/Statblock.tsx';

/** A stat block from the library, with its tools: homebrew can be deleted, edited and shared; GMG monsters remixed. */
export function PreviewDialog({ monster, onDelete, onEdit, onShare, onRemix, onAdd }: { monster: Monster; onDelete: () => void; onEdit: () => void; onShare: () => void; onRemix: () => void; onAdd: () => void }) {
  return (
    <>
      <div class="preview-top">
        <Statline monster={monster} />
      </div>
      <Statblock monster={monster} scope={`preview-${monster.id}`} />
      <div class="modal-bottom">
        {monster.source === 'homebrew' ? (
          <>
            <button class="outline danger" onClick={onDelete}>
              <Trash2 size={15} /> Delete
            </button>
            <button class="outline" onClick={onEdit}>
              <Pencil size={15} /> Edit
            </button>
            <button class="outline" onClick={onShare} title="Copy a link that carries this whole stat block">
              <Link2 size={15} /> Share
            </button>
          </>
        ) : (
          <button class="outline" onClick={onRemix} title="Open a copy in the Monster Forge">
            <Anvil size={15} /> Remix
          </button>
        )}
        <button class="solid" onClick={onAdd}>
          <Plus size={15} /> Add to encounter
        </button>
      </div>
    </>
  );
}

/** A monster from a shared link or file, shown before anything is saved. When you
 *  already have a different version of it, choose to replace yours or keep both. */
export function IncomingDialog({ monster, keepBoth, setKeepBoth, mine, same, onSave }: { monster: Monster; keepBoth: boolean; setKeepBoth: (keep: boolean) => void; mine?: Monster; same: boolean; onSave: (add: boolean) => void }) {
  return (
    <>
      <div class="preview-top">
        <Statline monster={monster} />
      </div>
      <Statblock monster={monster} scope={`incoming-${monster.id}`} />
      <div class="incoming-foot">
        {mine && !same && (
          <div class="incoming-conflict">
            <p>
              You already have a version of <strong>{mine.name}</strong> that differs from this one.
            </p>
            <div
              class="forge-segment"
              role="radiogroup"
              aria-label="Your version"
              onKeyDown={(e) => {
                if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
                  e.preventDefault();
                  setKeepBoth(!keepBoth);
                  window.setTimeout(() => document.querySelector<HTMLButtonElement>('.incoming-conflict [aria-checked="true"]')?.focus(), 0);
                }
              }}
            >
              <button role="radio" aria-checked={!keepBoth} tabIndex={keepBoth ? -1 : 0} onClick={() => setKeepBoth(false)}>
                Replace mine
              </button>
              <button role="radio" aria-checked={keepBoth} tabIndex={keepBoth ? 0 : -1} onClick={() => setKeepBoth(true)}>
                Keep both
              </button>
            </div>
          </div>
        )}
        <div class="modal-bottom">
          <span>{same ? 'Already in your library' : monster.sourceUrl ? 'Not saved yet' : 'Shared homebrew · not saved yet'}</span>
          {!same && (
            <button class="outline" onClick={() => onSave(false)}>
              {mine && !keepBoth ? 'Replace in library' : 'Save to library'}
            </button>
          )}
          <button class="solid" onClick={() => onSave(true)}>
            <Plus size={15} /> {same ? 'Add to encounter' : 'Save & add'}
          </button>
        </div>
      </div>
    </>
  );
}

/** Deleting homebrew that encounters still field asks first: Undo only lasts until a reload. */
export function DeleteHomebrewDialog({ monsters, encounters, onDelete, onKeep }: { monsters: Monster[]; encounters: { name: string; cards: { monsterId: string }[] }[]; onDelete: () => void; onKeep: () => void }) {
  const ids = new Set(monsters.map((m) => m.id));
  const using = encounters.map((e) => ({ name: e.name, n: e.cards.filter((c) => ids.has(c.monsterId)).length })).filter((e) => e.n);
  const creatures = using.reduce((sum, e) => sum + e.n, 0);
  const what = monsters.length === 1 ? monsters[0].name : `These ${monsters.length} monsters`;
  return (
    <div class="delete-copy">
      <p>
        {what} {monsters.length === 1 ? 'is' : 'are'} fielded in {using.length} {plural('encounter', using.length)}. Deleting also removes {creatures === 1 ? 'that creature' : `those ${creatures} creatures`}:
      </p>
      <ul class="delete-uses">
        {using.map((e) => (
          <li key={e.name}>
            <strong>{e.name}</strong>
            <span>
              {e.n} {plural('creature', e.n)}
            </span>
          </li>
        ))}
      </ul>
      <p class="import-hint">Undo brings everything back until the page is reloaded.</p>
      <div class="modal-bottom">
        <button class="outline danger" onClick={onDelete}>
          <Trash2 size={15} /> Delete and remove {plural('creature', creatures)}
        </button>
        <button class="solid" onClick={onKeep}>
          Keep
        </button>
      </div>
    </div>
  );
}
