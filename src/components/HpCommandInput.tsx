import { useEffect, useRef, useState } from 'preact/hooks';

/** One editable number per creature. While unfocused it displays HP; while
 * focused it accepts a command. Enter applies once and selects the new HP so
 * another hit can be entered immediately; Escape/blur discard drafts.
 * No numeric command is committed accidentally while navigating the board.
 */
export function HpCommandInput({ name, hp, maxHp, apply }: { name: string; hp: number; maxHp: number; apply: (raw: string) => number | null }) {
  const [draft, setDraft] = useState(String(hp));
  const [focused, setFocused] = useState(false);
  const shown = useRef(hp);
  // An untouched field follows HP even while focused, so ⌘Z after Enter shows the undone value.
  useEffect(() => {
    setDraft((d) => (!focused || d === String(shown.current) ? String(hp) : d));
    shown.current = hp;
  }, [hp, focused]);
  return (
    <div class="hp-value hp-command" style={{ '--digits': String(Math.max(maxHp, hp)).length }}>
      <input
        type="text"
        inputMode="text"
        enterKeyHint="done"
        autoComplete="off"
        spellcheck={false}
        aria-label={`${name}: ${hp} of ${maxHp} HP. Append -20 or +20 to the displayed HP to subtract or add, or replace it with 18 damage, =18 exact HP, +5 heal, !18 critical, v18 vulnerable, r18 resistant, ^18 bypass armor`}
        title="Append -20 / +20 to HP · 18 hit · d18+5 damage with modifier · =18 set · ! critical · v vulnerable · r resistant · ^ bypass"
        value={draft}
        data-pristine={draft === String(hp)}
        onFocus={(e) => {
          setFocused(true);
          e.currentTarget.select();
        }}
        onInput={(e) => setDraft(e.currentTarget.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.stopPropagation();
            setDraft(String(hp));
            e.currentTarget.blur();
          }
          if (e.key === 'Enter') {
            e.preventDefault();
            const value = apply(e.currentTarget.value);
            if (value !== null) {
              setDraft(String(value));
              e.currentTarget.select();
            }
          }
        }}
        onBlur={() => {
          setFocused(false);
          setDraft(String(hp));
        }}
      />
      <span class="hp-max">/{maxHp}</span>
      {focused && (
        <small class="hp-entry-help" aria-hidden="true">
          <b>18</b> hit · <b>!18</b> crit · <b>+5</b> heal · <b>=18</b> set · <b>100-20</b> edit
        </small>
      )}
    </div>
  );
}
