import { Heart, Shield } from 'lucide-preact';
import type { Monster } from '../lib/types.ts';
import { formatLevel } from '../lib/rules.ts';
import { kindLabel } from '../app/ui.ts';

/** One line, the way the book prints it: level, HP, armor (only when worn), saves. */
export function Statline({ monster }: { monster: Monster }) {
  return (
    <div class="statline">
      {monster.kind !== 'standard' && <i class={`kind-tag kind-${monster.kind}`}>{kindLabel(monster)}</i>}
      {!monster.summon && !(monster.kind === 'minion' && monster.level === 0) && (
        <span class="stat" title={`Level ${formatLevel(monster.level)}`}>
          <small>Lv</small>
          <b>{formatLevel(monster.level)}</b>
        </span>
      )}
      <span class="stat stat-hp" title={monster.hp == null && monster.hpPerHero ? `${monster.hpPerHero} HP per hero` : `${monster.hp ?? '—'} HP`}>
        <Heart size={13} aria-hidden="true" />
        {monster.hp == null && monster.hpPerHero ? (
          <>
            <b>{monster.hpPerHero}</b>
            <small>/hero</small>
            <span class="sr-only"> HP per hero</span>
          </>
        ) : (
          <>
            <b>{monster.hp ?? '—'}</b>
            <span class="sr-only"> HP</span>
          </>
        )}
      </span>
      {monster.armor !== 'none' && (
        <span class="stat stat-armor" title={`${monster.armor === 'medium' ? 'Medium' : 'Heavy'} armor`}>
          <Shield size={13} aria-hidden="true" />
          <b aria-hidden="true">{monster.armor === 'medium' ? 'M' : 'H'}</b>
          <span class="sr-only">{monster.armor === 'medium' ? 'Medium armor' : 'Heavy armor'}</span>
        </span>
      )}
      {monster.speed !== undefined && (
        <span class="stat" title={`Speed ${monster.speed}`}>
          <small>Spd</small>
          <b>{monster.speed}</b>
        </span>
      )}
      {monster.size && (
        <span class="stat" title={`${monster.size} size`}>
          <small>{monster.size}</small>
        </span>
      )}
      {monster.saves && (
        <span class="stat stat-saves" title="Save advantage (+) / disadvantage (−)">
          <small>Saves</small>
          <b>{monster.saves}</b>
        </span>
      )}
      <span class="statline-family" title={monster.family}>
        {monster.family}
      </span>
    </div>
  );
}
