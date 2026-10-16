import { useRef, useState } from 'preact/hooks';
import type { ToastStep } from './context.ts';

export type Toast = { message: string } & ToastStep;

/** How long a plain message stays: long enough to read, about 45 ms a character. */
export const readingTime = (message: string) => Math.max(2600, 1200 + message.length * 45);

/** One toast at a time. One that carries an Undo, Redo or another action stays longer. */
export function useToast() {
  const [toast, setToast] = useState<Toast | null>(null);
  const timer = useRef<number | undefined>(undefined);
  function notify(message: string, step: ToastStep = {}) {
    setToast({ message, ...step });
    clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(null), step.action ? 12000 : Math.max(step.undo || step.redo ? 7000 : 0, readingTime(message)));
  }
  return { toast, setToast, notify };
}
