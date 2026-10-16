import { Fragment } from 'preact';
import type { ComponentChildren } from 'preact';
import type { Monster } from '../lib/types.ts';
import { findDiceNotation } from '../lib/dice.ts';
import { plural, summonCount, summonFor } from '../lib/summons.ts';
import { useApp } from '../app/context.ts';

const DICE_IN_TEXT = /(\b\d*d\d+(?:\^[-+]?\d+)?n?(?:(?:\s*[+−-]\s*\d+c?)|(?:\s*[+−-]\s*\d*d\d+))*)/gi;

/** Stat block prose: dice in the text roll with a click (Shift: advantage, Alt:
 *  disadvantage), and summon phrases become one-tap summons. The badge states the
 *  resolved count, so "1/hero" reads as +4 at a four-hero table. */
export function Prose({ text, monster, canSummon }: { text: string; monster: Monster; canSummon: boolean }) {
  const { roll, summon, encounter } = useApp();
  // A summoned stat block's notes name dice ("roll d20 instead of d10"), they don't roll them.
  if (monster.summon) return <>{text}</>;
  const heroes = encounter.heroes.length;
  const dice = (part: string): ComponentChildren =>
    part.split(DICE_IN_TEXT).map((piece, i) => {
      const valid = findDiceNotation(piece) === piece.trim().replace(/\s/g, '').replace(/−/g, '-');
      return valid && /^\d*d\d+/i.test(piece.trim()) ? (
        <button key={i} class="inline-roll" title={`Roll ${piece.trim()} · Shift: advantage · Alt: disadvantage`} onClick={(e) => roll(piece.trim(), `${monster.name} · effect`, monster, 1, e.shiftKey ? 1 : e.altKey ? -1 : 0)}>
          {piece}
        </button>
      ) : (
        <span key={i}>{piece}</span>
      );
    });
  const summons = canSummon ? summonFor(monster, text) : [];
  if (!summons.length) return <>{dice(text)}</>;
  const pieces = [];
  let at = 0;
  for (const spec of summons) {
    if (spec.index > at) pieces.push(<Fragment key={`t${at}`}>{dice(text.slice(at, spec.index))}</Fragment>);
    const n = summonCount(spec, heroes);
    // A span, not a button, so a long phrase wraps with the sentence instead of breaking it.
    pieces.push(
      <span
        key={`s${spec.index}`}
        role="button"
        tabIndex={0}
        class="inline-summon"
        onClick={() => summon(monster, spec)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            summon(monster, spec);
          }
        }}
        aria-label={`Summon ${n} ${plural(spec.name, n)}${spec.perHero ? ` (${spec.count} per hero)` : ''}`}
        title={`Summon ${n} ${plural(spec.name, n)}${spec.perHero ? ` · ${spec.count} per hero × ${heroes}` : ''}${spec.die ? ` · attacks ${spec.die}` : ''}`}
      >
        {spec.text.replace(/\S+$/, '')}
        <span class="summon-tail">
          {/\S+$/.exec(spec.text)?.[0]}
          <b aria-hidden="true">+{n}</b>
        </span>
      </span>,
    );
    at = spec.index + spec.text.length;
  }
  if (at < text.length) pieces.push(<Fragment key={`t${at}`}>{dice(text.slice(at))}</Fragment>);
  return <>{pieces}</>;
}
