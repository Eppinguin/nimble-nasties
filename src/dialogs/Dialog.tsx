import { useEffect, useRef } from 'preact/hooks';
import type { ComponentChildren, RefObject } from 'preact';
import { X } from 'lucide-preact';
import { trapTab } from '../lib/focus.ts';

/** Dialogs take focus when they open (and again when their content changes, say
 *  preview → delete) and hand it back to their opener on close, unless something
 *  else (the forge) has already claimed it. Call it in the component that owns the
 *  open dialog, so it runs after the forge's own focus effect. */
export function useDialogFocus(open: string | null) {
  const ref = useRef<HTMLElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (open) {
      if (!opener.current) opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      ref.current?.focus();
    } else if (opener.current) {
      if (document.activeElement === document.body || !document.activeElement) opener.current.focus();
      opener.current = null;
    }
  }, [open]);
  return ref;
}

/** The modal frame every dialog shares: keeps Tab inside and closes on a click on
 *  the backdrop. Swapping the content keeps the same frame. Focus: `useDialogFocus`. */
export function Dialog({ title, wide, dialogRef, onClose, children }: { title: string; wide?: boolean; dialogRef: RefObject<HTMLElement | null>; onClose: () => void; children: ComponentChildren }) {
  return (
    <div
      class="modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section class={`modal ${wide ? 'preview-modal' : ''}`} role="dialog" aria-modal="true" aria-labelledby="modal-title" ref={dialogRef} tabIndex={-1} onKeyDown={(e) => trapTab(e, dialogRef.current)}>
        <header class="modal-head">
          <div>
            <h2 id="modal-title">{title}</h2>
          </div>
          <button class="icon-btn" onClick={onClose} aria-label="Close dialog">
            <X size={19} />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}
