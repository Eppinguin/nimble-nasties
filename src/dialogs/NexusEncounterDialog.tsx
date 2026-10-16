import { useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks';
import { ChevronDown, ExternalLink, Info, Minus, Plus, Swords, Users } from 'lucide-preact';
import type { Hero, Monster } from '../lib/types.ts';
import type { NexusEncounter } from '../lib/nexus.ts';
import { nexusCount, nexusRatio } from '../lib/nexus.ts';
import { encounterStats, formatLevel, formatLevels } from '../lib/rules.ts';
import { minionDie } from '../lib/horde.ts';
import type { difficulty } from '../lib/rules.ts';
import { isUniformParty, partyFor, partyLevel } from '../lib/party.ts';
import { sameMonster } from '../lib/share.ts';
import { plural } from '../lib/summons.ts';

const MAX_HEROES = 20;
const MAX_COUNT = 30;
const heroWord = (n: number) => (n === 1 ? 'hero' : 'heroes');
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** Each line's stat block as it will be fielded: the bundled GMG one when Nexus hosts a
 *  copy of it, else the Nexus homebrew. */
export type ResolvedEntry = { monster: Monster; official: boolean };

/** A Nimble Nexus encounter before it becomes one of yours. Nexus records the party it
 *  was built for; your party is the default, because that's who is at the table.
 *  Party size changes how many "per hero" monsters come (and per-hero HP); level only
 *  changes how hard the fight is, so both ratings stay in view. */
export function NexusEncounterDialog({ found, resolved, yours, mine, judge, onCreate }: { found: NexusEncounter; resolved: ResolvedEntry[]; yours: Hero[]; mine: Monster[]; judge: typeof difficulty; onCreate: (heroes: Hero[], counts: number[]) => void }) {
  // null: your party exactly as it is (mixed levels included).
  const [party, setParty] = useState<{ size: number; level: number } | null>(null);
  const [counts, setCounts] = useState<Record<number, number>>({});
  const size = party?.size ?? yours.length;
  const level = party?.level ?? partyLevel(yours);
  const mixed = !party && !isUniformParty(yours);
  const heroes = party ? partyFor(yours, party.size, party.level) : yours;
  const theirs = size === found.heroCount && level === found.heroLevel && !mixed;
  const yoursAlready = yours.length === found.heroCount && isUniformParty(yours) && partyLevel(yours) === found.heroLevel;
  const fielded = found.entries.map((entry, i) => counts[i] ?? nexusCount({ ...entry, monster: resolved[i].monster }, size));
  const total = fielded.reduce((a, b) => a + b, 0);

  const library = useMemo(() => resolved.map((r) => r.monster), [resolved]);
  const rate = (hs: Hero[], ns: number[]) => {
    const members = resolved.map((r, i) => ({ id: r.monster.id, monsterId: r.monster.id, count: ns[i] })).filter((m) => m.count > 0);
    return encounterStats(members, library, hs, judge);
  };
  const now = rate(heroes, fielded);
  const builtParty = partyFor(yours, found.heroCount, found.heroLevel);
  const asBuilt = rate(
    builtParty,
    found.entries.map((entry, i) => nexusCount({ ...entry, monster: resolved[i].monster }, found.heroCount)),
  );
  const newBrew = resolved.filter((r, i) => !r.official && fielded[i] > 0 && !mine.some((m) => m.id === r.monster.id)).length;

  const step = (field: 'size' | 'level', delta: number) =>
    setParty({
      size: clamp(field === 'size' ? size + delta : size, 1, MAX_HEROES),
      level: clamp(field === 'level' ? level + delta : level, 1, 20),
    });
  const setCount = (i: number, n: number) => setCounts((c) => ({ ...c, [i]: clamp(n, 0, MAX_COUNT) }));

  return (
    <form
      class="nexus-encounter"
      onSubmit={(e) => {
        e.preventDefault();
        if (total) onCreate(heroes, fielded);
      }}
    >
      <div class="nexus-top">
        <p class="nexus-credit">
          {found.author ? <>By {found.author} on </> : <>From </>}
          <a href={found.url} target="_blank" rel="noopener noreferrer">
            Nimble Nexus
            <ExternalLink size={13} aria-hidden="true" />
            <span class="sr-only"> (opens in a new tab)</span>
          </a>
        </p>
        {found.description && <Description text={found.description} />}
      </div>

      <section class="nexus-section" aria-labelledby="nexus-party-title">
        <h3 id="nexus-party-title" class="nexus-heading">
          <Users size={15} aria-hidden="true" /> Your party
        </h3>
        <div class="party-quick nexus-party">
          <div class="party-quick-cell">
            <span class="party-quick-label" id="nexus-party-count">
              Heroes
            </span>
            <div class="stepper" role="group" aria-labelledby="nexus-party-count">
              <button type="button" class="stepper-btn" aria-label="One hero fewer" disabled={size <= 1} onClick={() => step('size', -1)}>
                <Minus size={16} />
              </button>
              <output aria-live="polite" aria-label={`${size} ${heroWord(size)}`}>
                {size}
              </output>
              <button type="button" class="stepper-btn" aria-label="One hero more" disabled={size >= MAX_HEROES} onClick={() => step('size', 1)}>
                <Plus size={16} />
              </button>
            </div>
          </div>
          <div class="party-quick-cell">
            <span class="party-quick-label" id="nexus-party-level">
              Level {mixed && <em class="mixed-flag">Mixed</em>}
            </span>
            <div class="stepper" role="group" aria-labelledby="nexus-party-level">
              <button type="button" class="stepper-btn" aria-label="One level lower" disabled={level <= 1} onClick={() => step('level', -1)}>
                <Minus size={16} />
              </button>
              <output aria-live="polite" aria-label={mixed ? `Mixed levels, first hero level ${level}` : `Level ${level}`}>
                {level}
              </output>
              <button type="button" class="stepper-btn" aria-label="One level higher" disabled={level >= 20} onClick={() => step('level', 1)}>
                <Plus size={16} />
              </button>
            </div>
          </div>
        </div>
        <p class="nexus-built">
          <span>
            Built for{' '}
            <b>
              {found.heroCount} {heroWord(found.heroCount)} at level {found.heroLevel}
            </b>
            {yoursAlready && !party ? ', same as your party.' : '.'}
          </span>
          {!theirs && (
            <button type="button" class="text-btn" onClick={() => setParty({ size: found.heroCount, level: found.heroLevel })}>
              Use theirs
            </button>
          )}
          {party && !(party.size === yours.length && party.level === partyLevel(yours) && isUniformParty(yours)) && (
            <button type="button" class="text-btn" onClick={() => setParty(null)}>
              Back to yours
            </button>
          )}
        </p>
      </section>

      <section class="nexus-section" aria-labelledby="nexus-roster-title">
        <h3 id="nexus-roster-title" class="nexus-heading">
          <Swords size={15} aria-hidden="true" /> Monsters
        </h3>
        <ul class="nexus-roster">
          {found.entries.map((entry, i) => {
            const { monster, official } = resolved[i];
            const n = fielded[i];
            const scales = monster.kind !== 'legendary' && entry.perHero && counts[i] === undefined;
            const kept = mine.find((m) => m.id === monster.id);
            const source = official ? 'GMG' : kept ? (sameMonster(kept, monster) ? 'In your library' : 'Updates yours') : 'New homebrew';
            const ratio = monster.kind === 'legendary' ? 'Legendary, always one' : entry.perHero ? nexusRatio(entry) : null;
            return (
              <li class="nexus-row" key={`${monster.id}-${i}`} data-out={n === 0 || undefined}>
                <span class="nexus-count" aria-hidden="true">
                  {n}
                </span>
                <div class="nexus-name">
                  <b>{monster.name}</b>
                  <span>
                    {monster.kind === 'minion' ? 'Minion' : `Lv ${formatLevel(monster.level)}`}
                    {ratio && (
                      <>
                        {' · '}
                        <span class={scales ? 'nexus-scales' : undefined}>
                          {scales && <Users size={12} aria-hidden="true" />}
                          {ratio}
                        </span>
                      </>
                    )}
                    {' · '}
                    <span class={official ? 'nexus-source official' : 'nexus-source'}>{source}</span>
                  </span>
                  {minionHp(monster) && (
                    <small class="nexus-hint">
                      <Info size={13} aria-hidden="true" />
                      {minionHp(monster)}
                    </small>
                  )}
                </div>
                <div class="nexus-stepper" role="group" aria-label={`${monster.name}: ${n}`}>
                  <button type="button" class="stepper-btn" aria-label={`One ${monster.name} fewer`} disabled={n <= 0} onClick={() => setCount(i, n - 1)}>
                    <Minus size={15} />
                  </button>
                  <button type="button" class="stepper-btn" aria-label={`One ${monster.name} more`} disabled={n >= MAX_COUNT} onClick={() => setCount(i, n + 1)}>
                    <Plus size={15} />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
        {found.skipped > 0 && (
          <p class="party-mixed-note nexus-skipped">
            <Info size={15} aria-hidden="true" /> {found.skipped} {plural('monster', found.skipped)} in this encounter couldn't be read from Nimble Nexus and {found.skipped === 1 ? 'is' : 'are'} left out. {found.skipped === 1 ? 'It may be' : 'They may be'} private or unfinished.
          </p>
        )}
      </section>

      <section class="nexus-section nexus-rating" aria-label="Difficulty">
        <Rating title="For your party" stats={now} />
        {!theirs && <Rating title="As built" stats={asBuilt} quiet />}
      </section>

      <div class="modal-bottom">
        <span>{total ? <>New encounter{newBrew ? ` · ${newBrew} homebrew ${newBrew === 1 ? 'monster joins' : 'monsters join'} your library` : ''}</> : 'Add at least one monster'}</span>
        <button type="submit" class="solid" disabled={!total}>
          <Plus size={15} /> Create encounter
        </button>
      </div>
    </form>
  );
}

/** Nimble minions have no HP: any hit fells one, or with the Overkill rule their attack
 *  die is how much damage each soaks. A homebrew minion that lists HP gets told so. */
function minionHp(monster: Monster): string | null {
  if (monster.kind !== 'minion' || !monster.hp || monster.hp <= 1) return null;
  const die = minionDie(monster.actions.find((action) => action.notation)?.notation);
  return `Nexus lists ${monster.hp} HP. Minions fall to any hit${die ? ` (d${die} toughness with Overkill)` : ''}.`;
}

/** The author's setup text, a few lines tall until asked for more: some descriptions
 *  carry whole difficulty tables, and the party and monsters are what this dialog is for. */
function Description({ text }: { text: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [long, setLong] = useState(false);
  const [open, setOpen] = useState(false);
  useLayoutEffect(() => {
    const el = ref.current;
    if (el && !open) setLong(el.scrollHeight > el.clientHeight + 1);
  }, [text, open]);
  return (
    <>
      <div id="nexus-description" ref={ref} class="nexus-description" data-clamped={(long && !open) || undefined} data-open={open || undefined}>
        {paragraphs(text).map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
      {long && (
        <button type="button" class="nexus-more" aria-expanded={open} aria-controls="nexus-description" onClick={() => setOpen((v) => !v)}>
          {open ? 'Show less' : 'Show more'}
          <ChevronDown size={14} aria-hidden="true" style={{ transform: open ? 'rotate(180deg)' : undefined }} />
        </button>
      )}
    </>
  );
}

/** Nexus descriptions are light Markdown: paragraphs, line breaks and **bold**. */
function paragraphs(text: string) {
  return text
    .replace(/\r\n?/g, '\n')
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => block.split(/(\*\*[^*]+\*\*|\n)/).map((part, i) => (part === '\n' ? <br key={i} /> : /^\*\*[^*]+\*\*$/.test(part) ? <strong key={i}>{part.slice(2, -2)}</strong> : part)));
}

function Rating({ title, stats, quiet }: { title: string; stats: ReturnType<typeof encounterStats>; quiet?: boolean }) {
  const { difficulty: d, spent, budget } = stats;
  return (
    <div class="nexus-rate" data-difficulty={d.color} data-quiet={quiet || undefined}>
      <span class="party-quick-label">{title}</span>
      <span class="nexus-rate-value">
        <i class="difficulty-dot" aria-hidden="true" />
        <b>{d.label}</b>
        {spent > 0 && (
          <small>
            {formatLevels(spent)} of {budget} levels
          </small>
        )}
      </span>
    </div>
  );
}
