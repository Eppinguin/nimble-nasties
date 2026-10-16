import type { ComponentChildren } from 'preact';
import { ExternalLink } from 'lucide-preact';
import type { Monster } from '../lib/types.ts';
import { useApp } from '../app/context.ts';
import { EdgeRoll } from './RollControls.tsx';
import { Prose } from './Prose.tsx';

type Action = Monster['actions'][number];
const runIn = (name: string) => (/[.!?:]$/.test(name.trim()) ? name : `${name}.`);

/** The book's own order and run-in style: traits, then actions with their roll
 * floated beside the text, then Bloodied and Last Stand. Those two light up
 * while a creature in the lane is actually in that state.
 * `scope` keys the roll controls; previews (`preview-…`, `incoming-…`) can't summon
 * and show the source line. A minion lane passes `packRoll` to roll as a horde. */
export function Statblock({ monster, scope, live = {}, packRoll }: { monster: Monster; scope: string; live?: { bloodied?: boolean; lastStand?: boolean }; packRoll?: (action: Action) => ComponentChildren }) {
  const {
    rollAction,
    ui: { edges, setEdge },
  } = useApp();
  const preview = scope.startsWith('preview-') || scope.startsWith('incoming-');
  const prose = (text: string) => <Prose text={text} monster={monster} canSummon={!scope.startsWith('preview-')} />;
  return (
    <div class="statblock">
      {monster.traits.length > 0 && (
        <div class="sb-traits">
          {monster.traits.map((t, i) => (
            <p class="sb-trait" key={i}>
              <strong>{runIn(t.name)}</strong> {prose(t.description)}
            </p>
          ))}
        </div>
      )}
      <div class="sb-actions">
        {monster.actionInstructions && <p class="sb-instructions">{prose(monster.actionInstructions)}</p>}
        {monster.actions.map((action) => {
          const key = `${scope}|${action.id}`;
          const edge = edges[key] ?? 0;
          return (
            <div class="sb-action" key={action.id}>
              {action.notation &&
                (packRoll ? (
                  packRoll(action)
                ) : (
                  <EdgeRoll
                    name={action.name}
                    notation={action.notation}
                    allowEdge={monster.kind !== 'minion'}
                    edge={edge}
                    setEdge={(next) => setEdge(key, next)}
                    onRoll={() => {
                      rollAction(monster, action, edge);
                      setEdge(key, 0);
                    }}
                  />
                ))}
              <p>
                <strong>{runIn(action.name)}</strong> {action.description && prose(action.description)}
                {action.range && <span class="range">Range {action.range}</span>}
              </p>
            </div>
          );
        })}
      </div>
      {monster.bloodied && (
        <p class="sb-phase sb-bloodied" data-live={!!live.bloodied}>
          <strong>Bloodied</strong> {prose(monster.bloodied)}
        </p>
      )}
      {monster.lastStandText && (
        <p class="sb-phase sb-laststand" data-live={!!live.lastStand}>
          <strong>Last Stand</strong> {prose(monster.lastStandText)}
        </p>
      )}
      {preview && (
        <div class="source-line">
          {monster.source === 'official' ? 'GMG v1 · Original stat block' : monster.author ? `Homebrew by ${monster.author}${monster.sourceUrl ? ' · Nimble Nexus' : ''}` : 'Homebrew'}{' '}
          {monster.sourceUrl && (
            <a href={monster.sourceUrl} target="_blank" rel="noreferrer">
              Source <ExternalLink size={11} />
            </a>
          )}
        </div>
      )}
    </div>
  );
}
