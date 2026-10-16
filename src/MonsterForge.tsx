import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import { ArrowDown, Dices, Heart, Plus, RotateCcw, Shield, Swords, Trash2, X } from 'lucide-preact';
import type { Armor, Monster } from './lib/types.ts';
import { formatLevel } from './lib/rules.ts';
import { radioKeys, trapTab } from './lib/focus.ts';
import { ABILITIES, DICE, LAST_ROW, LEVEL_ROWS, SAVE_STATS, SIZES, addAbility, draftToMonster, forgeMath, newAction, newTrait, rollMonster, rollName, traitText } from './lib/forge.ts';
import type { Ability, AbilityTag, ForgeAction, ForgeDraft, ForgeKind, ForgeTrait, PayWith, SaveEdge } from './lib/forge.ts';

const KINDS: { kind: ForgeKind; label: string; note: string }[] = [
  { kind: 'standard', label: 'Standard', note: 'Uses the GMG monster table and counts toward the difficulty budget.' },
  { kind: 'minion', label: 'Minion', note: 'Always 1 HP, rolls one die, can’t crit or get advantage. Not counted in the budget.' },
  { kind: 'legendary', label: 'Legendary', note: 'A solo boss with Bloodied and Last Stand. GMG legends often carry more HP than the table: set it freely.' },
];
const TAGS: { tag: AbilityTag; label: string }[] = [
  { tag: 'offense', label: 'Offense' },
  { tag: 'defense', label: 'Defense' },
  { tag: 'control', label: 'Control' },
  { tag: 'movement', label: 'Movement' },
];
const PAY: { pay: PayWith; label: string }[] = [
  { pay: 'level', label: '+1 level' },
  { pay: 'hp', label: '−1 HP row' },
  { pay: 'damage', label: '−1 damage row' },
];
const ARMORS: { armor: Armor; label: string; column: 0 | 1 | 2 }[] = [
  { armor: 'none', label: 'None', column: 0 },
  { armor: 'medium', label: 'Medium', column: 1 },
  { armor: 'heavy', label: 'Heavy', column: 2 },
];
const STACKED = '(max-width: 1020px)';
const SAVE_CYCLE: SaveEdge[] = [0, 1, 2, -1];
const saveMark = (edge: SaveEdge = 0) => (edge > 0 ? '+'.repeat(edge) : edge < 0 ? '−' : 'd20');

function Field({ label, children, wide, hint }: { label: string; children: ComponentChildren; wide?: boolean; hint?: ComponentChildren }) {
  return (
    <div class={`forge-field ${wide ? 'wide' : ''}`}>
      <label>
        <span>{label}</span>
        {children}
      </label>
      {hint && <small>{hint}</small>}
    </div>
  );
}

/** A number you can clear and retype: the draft only takes values in range,
 *  and the field shows the live value again once you leave it. */
function NumberInput({ value, min, max, onCommit, placeholder }: { value: number | undefined; min: number; max: number; onCommit: (value: number | undefined) => void; placeholder?: string }) {
  const shown = value === undefined ? '' : String(value);
  const [text, setText] = useState(shown);
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (!focused) setText(shown);
  }, [shown, focused]);
  return (
    <input
      type="number"
      inputMode="numeric"
      min={min}
      max={max}
      placeholder={placeholder}
      value={text}
      onFocus={(e) => {
        setFocused(true);
        e.currentTarget.select();
      }}
      onBlur={() => setFocused(false)}
      onInput={(e) => {
        const raw = e.currentTarget.value;
        const number = Number(raw);
        setText(raw);
        onCommit(raw.trim() !== '' && Number.isFinite(number) && number >= min && number <= max ? Math.round(number) : undefined);
      }}
    />
  );
}

export function MonsterForge({
  initial,
  editing,
  heroes,
  budget,
  families,
  sheet,
  onSave,
  onClose,
}: {
  initial: ForgeDraft;
  editing?: Monster;
  heroes: number;
  budget: number;
  families: string[];
  sheet: (monster: Monster) => ComponentChildren;
  onSave: (monster: Monster, addToEncounter: boolean) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<ForgeDraft>(initial);
  const [rolled, setRolled] = useState(0);
  const [peek, setPeek] = useState<Ability | null>(null);
  const [needsName, setNeedsName] = useState(false);
  // Side by side the sheet is always in view; stacked, the tally jumps to it.
  const [stacked, setStacked] = useState(() => window.matchMedia(STACKED).matches);
  useEffect(() => {
    const query = window.matchMedia(STACKED);
    const change = () => setStacked(query.matches);
    query.addEventListener('change', change);
    return () => query.removeEventListener('change', change);
  }, []);
  const formRef = useRef<HTMLElement>(null);
  const previewRef = useRef<HTMLElement>(null);
  const start = useRef(JSON.stringify(initial));
  const nameRef = useRef<HTMLInputElement>(null);
  const dirty = JSON.stringify(draft) !== start.current;
  const math = forgeMath(draft);
  const id = editing?.id ?? 'homebrew-draft';
  const monster = useMemo(() => draftToMonster(draft, id), [draft, id]);
  const set = <K extends keyof ForgeDraft>(key: K, value: ForgeDraft[K]) => setDraft((old) => ({ ...old, [key]: value }));
  const minion = draft.kind === 'minion';
  const reach = Math.min(5, draft.row, LAST_ROW - draft.row);
  const share = budget > 0 && draft.kind === 'standard' ? Math.round((math.level / budget) * 100) : null;
  const named = draft.name.trim().length > 0;

  // Focus the name (or the dialog when editing), and hand focus back on close.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    if (editing) formRef.current?.focus();
    else nameRef.current?.focus();
    return () => opener?.focus?.({ preventScroll: true });
  }, []);
  // Keep the build inside the table when the level moves.
  useEffect(() => {
    if (Math.abs(draft.shape) > reach) set('shape', Math.sign(draft.shape) * reach);
  }, [reach]);

  function close() {
    if (dirty && !window.confirm('Discard this monster? Nothing has been saved.')) return;
    onClose();
  }
  function surprise() {
    const next = rollMonster(budget / Math.max(1, heroes));
    setDraft((old) => ({ ...next, kind: old.kind === 'minion' ? 'standard' : old.kind, payWith: old.payWith }));
    setRolled((n) => n + 1);
  }
  function save(add: boolean) {
    if (!named) {
      setNeedsName(true);
      nameRef.current?.focus();
      return;
    }
    onSave(draftToMonster(draft, editing?.id ?? `homebrew-${globalThis.crypto?.randomUUID?.() ?? Date.now()}`), add);
  }
  const patchTrait = (traitId: string, patch: Partial<ForgeTrait>) =>
    set(
      'traits',
      draft.traits.map((t) => (t.id === traitId ? { ...t, ...patch } : t)),
    );
  const patchAction = (actionId: string, patch: Partial<ForgeAction>) =>
    set(
      'actions',
      draft.actions.map((a) => (a.id === actionId ? { ...a, ...patch } : a)),
    );
  function keepFocus(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.stopPropagation();
      close();
      return;
    }
    trapTab(event, formRef.current);
  }
  const peekText = (ability: Ability) => traitText({ id: '', abilityId: ability.id, name: ability.name }, math.dc, draft.name);
  const shapeLabel = draft.shape === 0 ? 'Balanced' : draft.shape > 0 ? `Glass cannon ${draft.shape}` : `Tank ${-draft.shape}`;

  return (
    <div
      class="forge-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <section class="forge" role="dialog" aria-modal="true" aria-labelledby="forge-title" ref={formRef} tabIndex={-1} onKeyDown={keepFocus}>
        <header class="forge-head">
          <div>
            <h2 id="forge-title">{editing ? `Edit ${editing.name}` : 'Monster Forge'}</h2>
            <p>Built on the GMG monster table. Pick, tweak, play.</p>
          </div>
          <button type="button" class="forge-surprise" onClick={surprise} aria-label="Surprise me: roll a random monster" title="Roll a random monster near your party’s level">
            <Dices size={18} key={rolled} class={rolled ? 'is-rolling' : ''} aria-hidden="true" /> <span>Surprise me</span>
          </button>
          <button type="button" class="icon-btn" onClick={close} aria-label="Close the Monster Forge">
            <X size={19} />
          </button>
        </header>

        <div class="forge-body">
          <div class="forge-controls">
            <div class="forge-name">
              <input
                ref={nameRef}
                aria-label="Monster name"
                placeholder="Name your nasty…"
                maxLength={80}
                value={draft.name}
                aria-invalid={needsName && !named}
                aria-describedby={needsName && !named ? 'forge-name-needed' : undefined}
                onInput={(e) => {
                  set('name', e.currentTarget.value);
                  setNeedsName(false);
                }}
              />
              <button
                type="button"
                class="icon-btn"
                onClick={() => {
                  set('name', rollName());
                  setNeedsName(false);
                }}
                aria-label="Roll a random name"
                title="Roll a random name"
              >
                <Dices size={18} />
              </button>
            </div>
            {needsName && !named && (
              <p class="forge-name-needed" id="forge-name-needed" role="alert">
                Give it a name to save it, or roll one with the dice.
              </p>
            )}

            <section class="forge-step" aria-labelledby="forge-kind">
              <h3 id="forge-kind">Kind</h3>
              <div class="forge-segment" role="radiogroup" aria-labelledby="forge-kind" onKeyDown={radioKeys}>
                {KINDS.map((k) => (
                  <button type="button" role="radio" aria-checked={draft.kind === k.kind} tabIndex={draft.kind === k.kind ? 0 : -1} key={k.kind} onClick={() => set('kind', k.kind)}>
                    {k.label}
                  </button>
                ))}
              </div>
              <p class="forge-note">{KINDS.find((k) => k.kind === draft.kind)?.note}</p>
            </section>

            <section class="forge-step" aria-labelledby="forge-level">
              <h3 id="forge-level">
                Level <small>One row of the monster table</small>
              </h3>
              <div class="forge-levels" role="radiogroup" aria-labelledby="forge-level" onKeyDown={radioKeys}>
                {LEVEL_ROWS.map((line, row) => (
                  <button
                    type="button"
                    role="radio"
                    key={line.label}
                    aria-checked={draft.row === row}
                    tabIndex={draft.row === row ? 0 : -1}
                    aria-label={`Level ${line.label}`}
                    data-hp={!minion && row === math.hpRow && math.hpRow !== draft.row ? '' : undefined}
                    data-damage={row === math.damageRow && math.damageRow !== draft.row ? '' : undefined}
                    onClick={() => set('row', row)}
                  >
                    {line.label}
                  </button>
                ))}
              </div>
              <p class="forge-readout">
                <span>
                  Counts as <b>Lv {formatLevel(math.level)}</b>
                  {math.levelRow !== draft.row && <em> (+{math.levelRow - draft.row} for abilities)</em>}
                </span>
                <span>
                  Save DC <b>{math.dc}</b>
                </span>
                {share !== null && (
                  <span>
                    <b>{share}%</b> of your party’s budget
                  </span>
                )}
              </p>
            </section>

            {!minion && (
              <section class="forge-step" aria-labelledby="forge-armor">
                <h3 id="forge-armor">Armor &amp; HP</h3>
                <div class="forge-armor" role="radiogroup" aria-labelledby="forge-armor" onKeyDown={radioKeys}>
                  {ARMORS.map((a) => (
                    <button type="button" role="radio" key={a.armor} aria-checked={draft.armor === a.armor} tabIndex={draft.armor === a.armor ? 0 : -1} onClick={() => set('armor', a.armor)}>
                      <span>
                        {a.armor !== 'none' && <Shield size={14} aria-hidden="true" />}
                        {a.label}
                      </span>
                      <b>{LEVEL_ROWS[math.hpRow].hp[a.column]}</b>
                      <small>HP</small>
                    </button>
                  ))}
                </div>
                <p class="forge-note">{draft.armor === 'none' ? 'Most monsters are unarmored.' : draft.armor === 'medium' ? 'Medium: only rolled dice hurt it, bonuses don’t. Crits ignore armor.' : 'Heavy: takes half of the dice, no bonuses. Crits ignore armor.'}</p>
                <div class="forge-exact">
                  <Field
                    label="Exact HP"
                    hint={
                      draft.hp !== undefined ? (
                        <button type="button" class="forge-link" onClick={() => set('hp', undefined)}>
                          <RotateCcw size={13} /> Use the table ({math.tableHp})
                        </button>
                      ) : (
                        'From the table. Type to override.'
                      )
                    }
                  >
                    <NumberInput value={math.hp} min={1} max={9999} onCommit={(n) => set('hp', n)} />
                  </Field>
                </div>
              </section>
            )}

            {!minion && (
              <section class="forge-step" aria-labelledby="forge-shape">
                <h3 id="forge-shape">
                  Build <small>{shapeLabel}</small>
                </h3>
                <div class="forge-shape">
                  <span>
                    <Heart size={14} aria-hidden="true" /> Tank
                  </span>
                  <input type="range" aria-labelledby="forge-shape" aria-valuetext={shapeLabel} min={-reach} max={reach} step={1} value={draft.shape} disabled={reach === 0} onInput={(e) => set('shape', Number(e.currentTarget.value))} />
                  <span>
                    Glass cannon <Swords size={14} aria-hidden="true" />
                  </span>
                </div>
                <p class="forge-note">
                  {draft.shape === 0 ? (
                    'HP and damage both come from its own row.'
                  ) : (
                    <>
                      HP from the <b>Lv {LEVEL_ROWS[math.hpRow].label}</b> row, damage from the <b>Lv {LEVEL_ROWS[math.damageRow].label}</b> row. Same level, different fight.
                    </>
                  )}
                </p>
              </section>
            )}

            <section class="forge-step" aria-labelledby="forge-die">
              <h3 id="forge-die">
                Attack die <small>d8 is the default</small>
              </h3>
              <div class="forge-dice" role="radiogroup" aria-labelledby="forge-die" onKeyDown={radioKeys}>
                {DICE.map((d) => (
                  <button type="button" role="radio" key={d.die} aria-checked={draft.die === d.die} tabIndex={draft.die === d.die ? 0 : -1} title={d.note} onClick={() => set('die', d.die)}>
                    <b>d{d.die}</b>
                    <span>{d.theme}</span>
                  </button>
                ))}
              </div>
              {!minion && (
                <div class="forge-segment forge-attacks" role="radiogroup" aria-label="Attacks per turn" onKeyDown={radioKeys}>
                  <button type="button" role="radio" aria-checked={!draft.twoAttacks} tabIndex={!draft.twoAttacks ? 0 : -1} onClick={() => set('twoAttacks', false)}>
                    One big hit
                  </button>
                  <button type="button" role="radio" aria-checked={draft.twoAttacks} tabIndex={draft.twoAttacks ? 0 : -1} onClick={() => set('twoAttacks', true)}>
                    Two attacks (2×)
                  </button>
                </div>
              )}
              <p class="forge-readout">
                <span>
                  <Swords size={14} aria-hidden="true" />{' '}
                  <b class="forge-notation">
                    {math.attacks === 2 ? '2 × ' : ''}
                    {math.notation}
                  </b>
                </span>
                {!minion && (
                  <span>
                    ≈ <b>{math.damage}</b> damage per round
                  </span>
                )}
                <span>{DICE.find((d) => d.die === draft.die)?.note}</span>
              </p>
              {math.overshoot && <p class="forge-warn">A d{draft.die} hits harder than this level should. Pick a smaller die or a higher level.</p>}
            </section>

            <section class="forge-step" aria-labelledby="forge-abilities">
              <h3 id="forge-abilities">
                Abilities <small>{draft.traits.length ? `${draft.traits.length} on the sheet` : 'Optional flavor. Each one costs a step'}</small>
              </h3>
              <div class="forge-chips" onMouseLeave={() => setPeek(null)}>
                {TAGS.map((group) => (
                  <div class="forge-chip-group" key={group.tag} role="group" aria-label={`${group.label} abilities`}>
                    <span>{group.label}</span>
                    {ABILITIES.filter((a) => a.tag === group.tag).map((ability) => {
                      const on = draft.traits.some((t) => t.abilityId === ability.id);
                      return (
                        <button type="button" key={ability.id} class="forge-chip" aria-pressed={on} aria-describedby="forge-peek" onMouseEnter={() => setPeek(ability)} onFocus={() => setPeek(ability)} onClick={() => setDraft((old) => addAbility(old, ability))}>
                          {on ? <X size={12} aria-hidden="true" /> : <Plus size={12} aria-hidden="true" />}
                          {ability.name}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
              <p class="forge-peek" id="forge-peek">
                {peek ? (
                  <>
                    <b>{peek.name}.</b> {peekText(peek)}
                  </>
                ) : (
                  'Point at an ability to read it. Tap to put it on the sheet; tap again to take it off.'
                )}
              </p>
              <div class="forge-pay">
                <span id="forge-pay">Each ability costs</span>
                <div class="forge-segment" role="radiogroup" aria-labelledby="forge-pay" onKeyDown={radioKeys}>
                  {PAY.map((p) => (
                    <button type="button" role="radio" key={p.pay} aria-checked={draft.payWith === p.pay} tabIndex={draft.payWith === p.pay ? 0 : -1} disabled={minion && p.pay === 'hp'} onClick={() => set('payWith', p.pay)}>
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            <section class="forge-step" aria-labelledby="forge-words">
              <h3 id="forge-words">
                On the sheet <small>Every word is yours</small>
              </h3>
              {draft.traits.map((trait) => (
                <div class="forge-entry" key={trait.id}>
                  <div class="forge-entry-head">
                    <input aria-label="Trait name" placeholder="Trait name" value={trait.name} onInput={(e) => patchTrait(trait.id, { name: e.currentTarget.value })} />
                    <button
                      type="button"
                      class="icon-btn"
                      aria-label={`Remove ${trait.name || 'trait'}`}
                      onClick={() =>
                        set(
                          'traits',
                          draft.traits.filter((t) => t.id !== trait.id),
                        )
                      }
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                  <textarea aria-label={`${trait.name || 'Trait'} text`} rows={2} placeholder="What it does…" value={traitText(trait, math.dc, draft.name)} onInput={(e) => patchTrait(trait.id, { text: e.currentTarget.value })} />
                </div>
              ))}
              <button type="button" class="forge-add" onClick={() => set('traits', [...draft.traits, newTrait()])}>
                <Plus size={14} /> Write a trait
              </button>

              {draft.kind === 'legendary' && (
                <Field label="Before its actions" wide hint="Italic line above the actions, e.g. “After each hero’s turn, choose 1:”">
                  <textarea rows={2} value={draft.actionInstructions ?? ''} onInput={(e) => set('actionInstructions', e.currentTarget.value)} />
                </Field>
              )}

              {draft.actions.map((action, index) => {
                const auto = action.notation === 'auto';
                return (
                  <div class="forge-entry" key={action.id}>
                    <div class="forge-entry-head">
                      <input aria-label="Action name" placeholder={index ? 'Action name' : 'Strike'} value={action.name} onInput={(e) => patchAction(action.id, { name: e.currentTarget.value })} />
                      {draft.actions.length > 1 && (
                        <button
                          type="button"
                          class="icon-btn"
                          aria-label={`Remove ${action.name || 'action'}`}
                          onClick={() =>
                            set(
                              'actions',
                              draft.actions.filter((a) => a.id !== action.id),
                            )
                          }
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                    <div class="forge-roll">
                      <span>Roll</span>
                      <button type="button" aria-pressed={auto} class="forge-roll-auto" onClick={() => patchAction(action.id, { notation: auto ? math.notation : 'auto' })} title={auto ? 'Following the table. Click to edit by hand.' : 'Follow the table again'}>
                        {auto ? (
                          <>
                            Table · <b>{math.notation}</b>
                          </>
                        ) : (
                          <>
                            <RotateCcw size={13} /> Table
                          </>
                        )}
                      </button>
                      {!auto && <input aria-label={`${action.name || 'Action'} dice`} placeholder="No roll" value={action.notation} onInput={(e) => patchAction(action.id, { notation: e.currentTarget.value })} />}
                      <input class="forge-range" aria-label="Range" placeholder="Range" inputMode="numeric" value={action.range ?? ''} onInput={(e) => patchAction(action.id, { range: e.currentTarget.value })} />
                    </div>
                    <textarea aria-label={`${action.name || 'Action'} text`} rows={2} placeholder="On hit: … (dice like 1d6 become rolls; “summon 2 rat minions (d4)” becomes a summon)" value={action.description} onInput={(e) => patchAction(action.id, { description: e.currentTarget.value })} />
                  </div>
                );
              })}
              <button type="button" class="forge-add" onClick={() => set('actions', [...draft.actions, newAction()])}>
                <Plus size={14} /> Add an action
              </button>

              <div class="forge-phases">
                <Field label="Bloodied" wide hint="At half HP or less.">
                  <textarea class="phase-bloodied" rows={2} value={draft.bloodied ?? ''} onInput={(e) => set('bloodied', e.currentTarget.value)} placeholder="What changes when it’s hurt…" />
                </Field>
                {draft.kind === 'legendary' && (
                  <>
                    <Field label="Last Stand" wide hint="Left empty, the sheet says it’s dying and how much damage is left.">
                      <textarea class="phase-laststand" rows={2} value={draft.lastStandText ?? ''} onInput={(e) => set('lastStandText', e.currentTarget.value)} />
                    </Field>
                    <Field label="Last Stand damage" hint="Damage it takes after reaching 0 HP.">
                      <NumberInput value={draft.lastStand} min={1} max={9999} placeholder={String(math.hp)} onCommit={(n) => set('lastStand', n)} />
                    </Field>
                  </>
                )}
              </div>
            </section>

            <section class="forge-step" aria-labelledby="forge-details">
              <h3 id="forge-details">
                Details <small>Defaults: medium, speed 6, d20 saves</small>
              </h3>
              <div class="forge-grid">
                <Field label="Family" wide>
                  <input list="forge-families" value={draft.family} onInput={(e) => set('family', e.currentTarget.value)} />
                  <datalist id="forge-families">
                    {families.map((f) => (
                      <option key={f} value={f} />
                    ))}
                  </datalist>
                </Field>
                <Field label="Size">
                  <select value={draft.size} onChange={(e) => set('size', e.currentTarget.value)}>
                    {SIZES.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Speed">
                  <NumberInput
                    value={draft.speed}
                    min={0}
                    max={30}
                    onCommit={(n) => {
                      if (n !== undefined) set('speed', n);
                    }}
                  />
                </Field>
              </div>
              <div class="forge-saves" role="group" aria-label="Saves: tap to cycle advantage and disadvantage">
                {SAVE_STATS.map((stat) => {
                  const edge = draft.saves[stat] ?? 0;
                  return (
                    <button
                      type="button"
                      key={stat}
                      data-edge={edge > 0 ? 'adv' : edge < 0 ? 'dis' : 'none'}
                      aria-label={`${stat} save: ${edge > 0 ? `advantage ${edge}` : edge < 0 ? 'disadvantage' : 'normal'}. Tap to change`}
                      onClick={() => set('saves', { ...draft.saves, [stat]: SAVE_CYCLE[(SAVE_CYCLE.indexOf(edge) + 1) % SAVE_CYCLE.length] })}
                    >
                      <small>{stat}</small>
                      <b>{saveMark(edge)}</b>
                    </button>
                  );
                })}
              </div>
            </section>
          </div>

          <aside class="forge-preview" aria-label="Live stat block" ref={previewRef}>
            <div class="forge-sheet" key={rolled}>
              {sheet(monster)}
            </div>
          </aside>
        </div>

        <footer class="forge-foot">
          {stacked ? (
            <button type="button" class="forge-tally" onClick={() => previewRef.current?.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })} aria-label="Show the stat block">
              <b>{named ? draft.name.trim() : 'Unnamed'}</b>
              <span>
                {minion ? 'Minion' : `Lv ${formatLevel(math.level)}`} · {math.hp} HP · {math.attacks === 2 ? '2× ' : ''}
                {math.notation}
              </span>
              <ArrowDown size={15} aria-hidden="true" />
            </button>
          ) : (
            <p class="forge-tally">
              <b>{named ? draft.name.trim() : 'Unnamed'}</b>
              <span>
                {minion ? 'Minion' : `Lv ${formatLevel(math.level)}`} · {math.hp} HP · {math.attacks === 2 ? '2× ' : ''}
                {math.notation}
              </span>
            </p>
          )}
          <button type="button" class="outline forge-cancel" onClick={close}>
            Cancel
          </button>
          <button type="button" class="outline" onClick={() => save(false)}>
            {editing ? 'Save changes' : 'Save to library'}
          </button>
          <button type="button" class="solid" onClick={() => save(true)}>
            <Plus size={15} /> {editing ? 'Save & add' : 'Add to encounter'}
          </button>
        </footer>
      </section>
    </div>
  );
}
