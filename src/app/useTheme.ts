import { useEffect, useState } from 'preact/hooks';
import { THEME_KEY, readStored, writeStored } from './storage.ts';

export type Theme = 'system' | 'light' | 'dark';

const parse = (t: string | null): Theme => (t === 'light' || t === 'dark' ? t : 'system');

/** Light, dark or the system's choice; index.html applies a stored choice before first paint.
 *  A change made in another tab follows here too. */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => parse(readStored(THEME_KEY)));
  useEffect(() => {
    const root = document.documentElement;
    // Swap every color at once instead of letting each element's own transition smear it.
    root.classList.add('theme-switching');
    if (theme === 'system') root.removeAttribute('data-theme');
    else root.dataset.theme = theme;
    writeStored(THEME_KEY, theme);
    const frame = requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove('theme-switching')));
    return () => cancelAnimationFrame(frame);
  }, [theme]);
  useEffect(() => {
    const follow = (event: StorageEvent) => {
      if (event.key === THEME_KEY) setTheme(parse(event.newValue));
    };
    window.addEventListener('storage', follow);
    return () => window.removeEventListener('storage', follow);
  }, []);
  return [theme, setTheme] as const;
}
