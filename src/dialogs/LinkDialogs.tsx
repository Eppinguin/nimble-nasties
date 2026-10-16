import { FileUp, Info, Link2 } from 'lucide-preact';

export type ImportLinkState = { text: string; error?: string; busy?: boolean };

/** Import takes a link (a shared monster, or a Nimble Nexus monster, collection or encounter) or a file. A Nexus fetch
 *  keeps the dialog open, so a failure shows beside the link it was about. */
export function ImportDialog({ link, setLink, onSubmit, onChooseFile }: { link: ImportLinkState; setLink: (link: ImportLinkState) => void; onSubmit: () => void; onChooseFile: () => void }) {
  return (
    <form
      class="import-copy"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      aria-busy={link.busy ? true : undefined}
    >
      <label class="import-label" for="import-link">
        Paste a link
      </label>
      <input
        id="import-link"
        class="import-link"
        type="url"
        inputMode="url"
        autoComplete="off"
        spellcheck={false}
        autoFocus
        readOnly={link.busy}
        placeholder="https://nimble.nexus/encounters/…"
        value={link.text}
        aria-invalid={link.error ? true : undefined}
        aria-describedby="import-hint"
        onInput={(e) => setLink({ text: e.currentTarget.value })}
      />
      <p id="import-hint" class={link.error ? 'import-hint import-error' : 'import-hint'} role={link.error ? 'alert' : undefined}>
        {link.error && <Info size={14} aria-hidden="true" />}
        {link.error ?? 'A monster someone shared from Nimble Nasties, or a monster, collection or encounter on Nimble Nexus (nimble.nexus or nimblenomi.com).'}
      </p>
      <div class="modal-bottom">
        <button type="button" class="outline" onClick={onChooseFile} title="Monsters or encounters exported from Nimble Nasties, or a saved Nimble Nexus API response">
          <FileUp size={15} /> Choose a file…
        </button>
        <button type="submit" class="solid" disabled={link.busy}>
          <Link2 size={15} /> {link.busy ? 'Fetching from Nexus…' : 'Import link'}
        </button>
      </div>
    </form>
  );
}

/** A share link the clipboard refused, shown to copy by hand. */
export function ShareLinkDialog({ name, url, onDone }: { name: string; url: string; onDone: () => void }) {
  return (
    <div class="import-copy">
      <label class="import-label" for="share-link">
        Copy this link
      </label>
      <input id="share-link" class="import-link" type="url" readOnly autoFocus spellcheck={false} value={url} aria-describedby="share-hint" onFocus={(e) => e.currentTarget.select()} />
      <p id="share-hint" class="import-hint">
        The clipboard isn't available here. The whole stat block is in the link and nothing is uploaded: anyone who opens it can preview and save {name}.
      </p>
      <div class="modal-bottom">
        <button class="solid" onClick={onDone}>
          Done
        </button>
      </div>
    </div>
  );
}
