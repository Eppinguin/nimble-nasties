import { useRef, useState } from 'preact/hooks';

/** A set of ids that is marked for a moment (an arrival or a stamp animation), then clears. */
export function useFlash(ms: number) {
  const [ids, setIds] = useState<ReadonlySet<string>>(new Set());
  const timer = useRef<number | undefined>(undefined);
  function flash(next: string[]) {
    setIds(new Set(next));
    clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setIds(new Set()), ms);
  }
  return [ids, flash] as const;
}
