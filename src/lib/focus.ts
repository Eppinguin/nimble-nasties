const FOCUSABLE = 'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';

/** Keeps Tab and Shift+Tab cycling inside a modal dialog, so focus never lands on the board behind it. */
export function trapTab(event: KeyboardEvent, dialog: HTMLElement | null): void {
  if (event.key !== 'Tab' || !dialog) return;
  const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null);
  const first = focusable[0],
    last = focusable.at(-1);
  if (!first || !last) {
    event.preventDefault();
    return;
  }
  if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

/** Arrow keys move through a row of radio buttons, as a native radio group would. */
export function radioKeys(event: KeyboardEvent) {
  if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
  const group = event.currentTarget as HTMLElement;
  const items = Array.from(group.querySelectorAll<HTMLButtonElement>('[role="radio"]:not(:disabled)'));
  const index = items.indexOf(document.activeElement as HTMLButtonElement);
  if (index < 0) return;
  event.preventDefault();
  const next = items[(index + (event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 1) + items.length) % items.length];
  next.focus();
  next.click();
}
