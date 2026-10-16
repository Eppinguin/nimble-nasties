import { ChevronDown, Info, Minus, Plus, Users, X } from 'lucide-preact';
import type { Hero } from '../lib/types.ts';
import { uid } from '../lib/board.ts';
import { isUniformParty, partyLevel, setHeroLevel, setQuickParty } from '../lib/party.ts';
import { useApp } from '../app/context.ts';
import type { Library } from './useLibrary.ts';

const MAX_HEROES = 20;
const clampLevel = (n: number) => Math.min(20, Math.max(1, n));

/** The party behind the difficulty budget: hero count and a shared level, or each hero's own. */
export function PartySetup({ party, setParty }: Pick<Library, 'party' | 'setParty'>) {
  const { encounter, patchEncounter } = useApp();
  const { open, detailed } = party;
  const setOpen = (fn: (open: boolean) => boolean) => setParty((p) => ({ ...p, open: fn(p.open) }));
  const setDetailed = (fn: (detailed: boolean) => boolean) => setParty((p) => ({ ...p, detailed: fn(p.detailed) }));
  const heroes = encounter.heroes;
  const uniform = isUniformParty(heroes);
  const shared = partyLevel(heroes);
  const setHeroes = (label: string, fn: (heroes: Hero[]) => Hero[], key?: string) => patchEncounter(label, (enc) => ({ ...enc, heroes: fn(enc.heroes) }), key ? { key } : undefined);

  return (
    <div class="drawer-party-inline">
      <button class="drawer-party-toggle" aria-expanded={open} aria-controls="drawer-party-controls" onClick={() => setOpen((v) => !v)} aria-label={`Party: ${heroes.length} heroes, ${uniform ? `level ${shared}` : 'mixed levels'}. ${open ? 'Hide' : 'Show'} party setup`}>
        <Users size={15} />
        <span>
          {heroes.length} heroes · {uniform ? `level ${shared}` : 'mixed levels'}
        </span>
        <ChevronDown size={14} style={{ transform: open ? 'rotate(180deg)' : undefined }} />
      </button>
      {open && (
        <div id="drawer-party-controls" class="drawer-party-controls">
          <div class="party-quick">
            <div class="party-quick-cell">
              <span class="party-quick-label" id="drawer-party-count">
                Heroes
              </span>
              <div class="stepper" role="group" aria-labelledby="drawer-party-count">
                <button type="button" class="stepper-btn" aria-label="Remove one hero" disabled={heroes.length <= 1} onClick={() => setHeroes(`Party: ${heroes.length - 1} heroes`, (hs) => setQuickParty(hs, hs.length - 1, partyLevel(hs)))}>
                  <Minus size={16} />
                </button>
                <output aria-live="polite" aria-label={`${heroes.length} heroes`}>
                  {heroes.length}
                </output>
                <button type="button" class="stepper-btn" aria-label="Add one hero" disabled={heroes.length >= MAX_HEROES} onClick={() => setHeroes(`Party: ${heroes.length + 1} heroes`, (hs) => setQuickParty(hs, hs.length + 1, partyLevel(hs)))}>
                  <Plus size={16} />
                </button>
              </div>
            </div>
            <div class="party-quick-cell">
              <span class="party-quick-label" id="drawer-party-level">
                Level {!uniform && <em class="mixed-flag">Mixed</em>}
              </span>
              <div class="stepper" role="group" aria-labelledby="drawer-party-level">
                <button type="button" class="stepper-btn" aria-label="Lower every hero by one level" disabled={shared <= 1} onClick={() => setHeroes(`Party: level ${shared - 1}`, (hs) => setQuickParty(hs, hs.length, shared - 1))}>
                  <Minus size={16} />
                </button>
                <output aria-live="polite" aria-label={uniform ? `Every hero level ${shared}` : `Mixed levels, first hero level ${shared}`}>
                  {shared}
                </output>
                <button type="button" class="stepper-btn" aria-label="Raise every hero by one level" disabled={shared >= 20} onClick={() => setHeroes(`Party: level ${shared + 1}`, (hs) => setQuickParty(hs, hs.length, shared + 1))}>
                  <Plus size={16} />
                </button>
              </div>
            </div>
          </div>
          {!uniform && !detailed && (
            <p class="party-mixed-note">
              <Info size={15} /> Mixed levels set. The level stepper resets every hero to the same level.
            </p>
          )}
          <button type="button" class="party-details-toggle" aria-expanded={detailed} aria-controls="drawer-party-roster" onClick={() => setDetailed((v) => !v)}>
            {detailed ? 'Hide individual levels' : !uniform ? 'Review mixed levels' : 'Set individual levels'}
            <ChevronDown size={15} style={{ transform: detailed ? 'rotate(180deg)' : undefined }} />
          </button>
          {detailed && (
            <div id="drawer-party-roster">
              {!uniform && (
                <p class="party-mixed-note">
                  <Info size={15} /> Mixed levels below. The level stepper sets every hero to the same level — or tune each hero individually.
                </p>
              )}
              <div class="party-roster-head" aria-hidden="true">
                <span>Hero</span>
                <span>Level</span>
                <span></span>
              </div>
              <div class="party-table">
                {heroes.map((h) => (
                  <div class="party-table-row" key={h.id}>
                    <input
                      aria-label={`Name of ${h.name}`}
                      value={h.name}
                      onInput={(e) => {
                        const name = e.currentTarget.value;
                        setHeroes(`Hero renamed to ${name}`, (hs) => hs.map((hero) => (hero.id === h.id ? { ...hero, name } : hero)), `hero-name:${h.id}`);
                      }}
                    />
                    <div class="level-stepper" role="group" aria-label={`${h.name} level`}>
                      <button type="button" aria-label={`Lower ${h.name} to level ${h.level - 1}`} disabled={h.level <= 1} onClick={() => setHeroes(`${h.name}: level ${h.level - 1}`, (hs) => setHeroLevel(hs, h.id, h.level - 1))}>
                        <Minus size={14} />
                      </button>
                      <input
                        aria-label={`${h.name} level`}
                        type="number"
                        min="1"
                        max="20"
                        inputMode="numeric"
                        value={h.level}
                        onInput={(e) => {
                          const raw = e.currentTarget.value;
                          if (raw === '') return;
                          const n = Math.floor(Number(raw));
                          if (Number.isFinite(n)) setHeroes(`${h.name}: level ${clampLevel(n)}`, (hs) => setHeroLevel(hs, h.id, clampLevel(n)), `hero-level:${h.id}`);
                        }}
                      />
                      <button type="button" aria-label={`Raise ${h.name} to level ${h.level + 1}`} disabled={h.level >= 20} onClick={() => setHeroes(`${h.name}: level ${h.level + 1}`, (hs) => setHeroLevel(hs, h.id, h.level + 1))}>
                        <Plus size={14} />
                      </button>
                    </div>
                    <button class="icon-btn" aria-label={`Remove ${h.name}`} disabled={heroes.length < 2} onClick={() => setHeroes(`${h.name} left the party`, (hs) => hs.filter((hero) => hero.id !== h.id))}>
                      <X size={15} />
                    </button>
                  </div>
                ))}
              </div>
              <button class="outline party-add" disabled={heroes.length >= MAX_HEROES} onClick={() => setHeroes('Hero added', (hs) => [...hs, { id: uid(), name: `Hero ${hs.length + 1}`, level: partyLevel(hs), hp: 28, maxHp: 28, defense: 2 }])}>
                <Plus size={15} /> Add hero
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
