import type { ComponentChildren } from 'preact';
import { Info, Moon, Plus, Sun, SunMoon, X } from 'lucide-preact';
import type { Theme } from '../app/useTheme.ts';
import { formatLevels } from '../lib/rules.ts';

const THEMES = [
  // Sun-moon draws smaller inside its box, so it gets more room, with a thinner stroke to keep the line weight.
  { theme: 'system', label: 'Match system', Icon: SunMoon, size: 21, stroke: (2 * 18) / 21 },
  { theme: 'light', label: 'Light', Icon: Sun, size: 18, stroke: 2 },
  { theme: 'dark', label: 'Dark', Icon: Moon, size: 18, stroke: 2 },
] as const;
const THEME_NEXT: Record<Theme, Theme> = { system: 'light', light: 'dark', dark: 'system' };

/** The black header bar: logo, the encounter switcher, About, theme and the difficulty / library shortcuts. */
export function AppHeader({
  picker,
  theme,
  setTheme,
  difficulty,
  libraryOpen,
  onAbout,
  onOpenLibrary,
  onToggleLibrary,
}: {
  picker: ComponentChildren;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  difficulty: { color: string; label: string; spent: number; budget: number };
  libraryOpen: boolean;
  onAbout: () => void;
  onOpenLibrary: () => void;
  onToggleLibrary: () => void;
}) {
  return (
    <header class="topbar app-header">
      <div class="topbar-left">
        <div class="header-brand" aria-label="Nimble Nasties">
          <picture class="header-logo" aria-hidden="true">
            <source media="(max-width: 790px)" srcSet="/nimble-nasties-icon.webp" type="image/webp" />
            <img src="/nimble-nasties-logo.webp" alt="" width="178" height="100" decoding="async" fetchPriority="high" />
          </picture>
          <span class="sr-only">Nimble Nasties</span>
        </div>
        <span class="header-divider" aria-hidden="true" />
        {picker}
      </div>
      <div class="topbar-right">
        <button class="header-rules header-icon" title="About, license and more tools" aria-label="About Nimble Nasties" onClick={onAbout}>
          <Info size={18} />
        </button>
        <ThemeCycle theme={theme} setTheme={setTheme} />
        <button class="difficulty-shortcut" data-difficulty={difficulty.color} title="Difficulty · spent / total monster level budget · open library" onClick={onOpenLibrary}>
          <span class="difficulty-dot" aria-hidden="true" />
          <b>{difficulty.label}</b>
          <small>
            {formatLevels(difficulty.spent)}/{difficulty.budget}
          </small>
        </button>
        <button class="outline compact desktop-add-trigger" aria-expanded={libraryOpen} aria-controls="monster-library" onClick={onToggleLibrary}>
          {libraryOpen ? <X size={15} /> : <Plus size={15} />}
          {libraryOpen ? 'Close library' : 'Add monsters'}
        </button>
      </div>
    </header>
  );
}

/** One icon for the current theme; a click steps to the next. */
function ThemeCycle({ theme, setTheme }: { theme: Theme; setTheme: (theme: Theme) => void }) {
  const { label, Icon, size, stroke } = THEMES.find((t) => t.theme === theme)!;
  const next = THEMES.find((t) => t.theme === THEME_NEXT[theme])!;
  return (
    <button class="header-rules header-icon" title={`Theme: ${label} · switch to ${next.label}`} aria-label={`Color theme: ${label}. Switch to ${next.label}`} onClick={() => setTheme(next.theme)}>
      <Icon size={size} strokeWidth={stroke} />
    </button>
  );
}
