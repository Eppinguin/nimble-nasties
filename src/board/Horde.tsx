import { useState } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import { ArrowRight, Check, MoreHorizontal, Plus, Skull, X } from 'lucide-preact';
import type { Monster } from '../lib/types.ts';
import type { NemesisCard } from '../lib/board.ts';
import { uid } from '../lib/board.ts';
import { defeatInPack, hitKills, lanePacks, mergePacks, minionDie, moveToPack, packEntries, renamePack, setPackDone, splitPack, standingIn, toAct, undoPackEntry } from '../lib/horde.ts';
import type { LanePack, PackRoll } from '../lib/horde.ts';
import { plural } from '../lib/summons.ts';
import { useApp } from '../app/context.ts';

type Action = Monster['actions'][number];
const MINIONS_TYPE = 'application/x-nimble-minions';

/** A minion stat block's horde: one band per pack, or a single unnamed one.
 *  Tokens defeat with a tap; in move mode they are picked and moved between packs
 *  (or dragged onto another pack). Each pack has its turn box, a Hit field and,
 *  once split, its own attack rolls. */
export function Horde({ monster, playing, packs, laneCards, packRoll }: { monster: Monster; playing: Monster; packs: LanePack[]; laneCards: NemesisCard[]; packRoll: (pack: LanePack, action: Action) => ComponentChildren }) {
  const { encounter, patchEncounter, notify, stamp, toggleMinion, cardName, freshIds, stampIds, ui } = useApp();
  const { arrange, setArrange, picked, setPicked, packMenu, setPackMenu } = ui;
  const arranging = arrange === monster.id;
  const setArranging = (on: boolean) => setArrange(on ? monster.id : null);
  // A token drag in flight, and the pack it hovers.
  const [tokenDrag, setTokenDrag] = useState<string[] | null>(null);
  const [packDrop, setPackDrop] = useState<string | null>(null);
  const split = packs.length > 1;
  const here = picked.filter((id) => laneCards.some((card) => card.id === id));
  const die = minionDie(playing.actions.find((action) => action.notation)?.notation);
  const attacks = playing.actions.filter((action) => action.notation);
  const packLabel = (pack: LanePack) => (split ? pack.name : plural(monster.name, 2));

  function setPackTurn(pack: LanePack, done: boolean) {
    const who = packLabel(pack);
    if (done) stamp(toAct(pack).map((card) => card.id));
    patchEncounter(done ? `${who}: the rest hold back` : `${who}: turn unmarked`, (e) => setPackDone(e, monster.id, pack.id, done, uid()));
  }
  function undoPackRoll(entry: PackRoll) {
    patchEncounter(entry.held ? 'Holding back undone' : `${entry.action} roll taken back`, (e) => undoPackEntry(e, entry.id));
  }
  /** Overkill off: the number is how many fell. On: it is the damage, and the
   * excess carries over to other minions in the pack (die size each). */
  function hitPack(pack: LanePack, raw: string): boolean {
    const amount = Math.floor(Number(raw.trim()));
    if (!(amount > 0)) {
      notify(encounter.overkill ? 'Type the damage dealt, e.g. 14' : 'Type how many minions went down, e.g. 3');
      return false;
    }
    const kills = encounter.overkill ? hitKills(amount, die, true) : amount;
    const fallen = Math.min(kills, standingIn(pack).length);
    if (!fallen) return false;
    const where = split ? ` in ${pack.name}` : '';
    const label = `${fallen} ${plural(monster.name, fallen)} defeated${where}${encounter.overkill ? ` (${amount} damage${die ? `, d${die} each` : ''})` : ''}`;
    notify(label, { undo: patchEncounter(label, (e) => defeatInPack(e, monster.id, pack.id, kills).encounter) });
    return true;
  }
  function moveMinions(ids: string[], target: string | null) {
    if (!ids.length) return;
    const id = uid();
    const preview = moveToPack(encounter, monster.id, ids, target, id);
    const into = preview.encounter.packs?.find((p) => p.id === preview.packId)?.name ?? 'pack';
    const label = target === null ? `New pack: ${into} (${ids.length})` : `${ids.length} ${plural(monster.name, ids.length)} to ${into}`;
    const step = patchEncounter(label, (e) => moveToPack(e, monster.id, ids, target, id).encounter);
    setPicked([]);
    notify(label, { undo: step });
  }
  const togglePick = (id: string) => setPicked((all) => (all.includes(id) ? all.filter((x) => x !== id) : [...all, id]));
  function tokenDragStart(event: DragEvent, card: NemesisCard) {
    const transfer = event.dataTransfer;
    if (!transfer) return;
    event.stopPropagation();
    const ids = picked.includes(card.id) ? picked.filter((id) => encounter.cards.some((c) => c.id === id && c.monsterId === monster.id)) : [card.id];
    // Its own type, so the board's stat block drop never claims a minion.
    transfer.setData(MINIONS_TYPE, ids.join(','));
    transfer.effectAllowed = 'move';
    setTokenDrag(ids);
  }
  function dropProps(target: string | null, key: string) {
    const ours = (event: DragEvent) => tokenDrag !== null && Array.from(event.dataTransfer?.types ?? []).includes(MINIONS_TYPE);
    return {
      onDragOver: (event: DragEvent) => {
        if (!ours(event)) return;
        event.preventDefault();
        event.stopPropagation();
        if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
        if (packDrop !== key) setPackDrop(key);
      },
      onDragLeave: (event: DragEvent) => {
        if (!(event.currentTarget as HTMLElement).contains(event.relatedTarget as Node)) setPackDrop((previous) => (previous === key ? null : previous));
      },
      onDrop: (event: DragEvent) => {
        if (!ours(event)) return;
        event.preventDefault();
        event.stopPropagation();
        const ids = tokenDrag ?? [];
        setTokenDrag(null);
        setPackDrop(null);
        const already =
          target !== null &&
          ids.every((id) => {
            const c = encounter.cards.find((x) => x.id === id);
            return (
              c &&
              lanePacks(encounter, monster.id)
                .find((p) => p.id === target)
                ?.cards.includes(c)
            );
          });
        if (!already) moveMinions(ids, target);
      },
    };
  }
  const tokenKeys = (event: KeyboardEvent) => {
    const target = event.target as HTMLElement;
    if (!target.classList.contains('horde-token')) return;
    const all = Array.from(target.closest('.horde')?.querySelectorAll<HTMLButtonElement>('.horde-token') ?? []);
    const at = all.indexOf(target as HTMLButtonElement);
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      all[Math.min(all.length - 1, at + 1)]?.focus();
    }
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      all[Math.max(0, at - 1)]?.focus();
    }
    if (event.key === 'm' || event.key === 'M') {
      event.preventDefault();
      const id = target.dataset.card;
      if (!arranging) {
        setArranging(true);
        setPicked(id ? [id] : []);
      }
    }
  };

  return (
    <div class={`horde ${split ? 'is-split' : ''} ${arranging ? 'is-arranging' : ''}`} onKeyDown={tokenKeys}>
      {arranging && (
        <div class="horde-move" role="group" aria-label={`Move ${monster.name} minions between packs`}>
          <span class="horde-move-count" aria-live="polite">
            {here.length ? (
              <>
                <b>{here.length}</b> picked · move to
              </>
            ) : (
              'Tap minions to pick them'
            )}
          </span>
          <div class="horde-move-targets">
            {split &&
              packs.map((pack) => (
                <button type="button" key={pack.id || 'loose'} disabled={!here.length} onClick={() => moveMinions(here, pack.id)}>
                  {pack.name}
                </button>
              ))}
            <button type="button" class="horde-move-new" disabled={!here.length} onClick={() => moveMinions(here, null)}>
              <Plus size={14} /> New pack
            </button>
            <button
              type="button"
              class="horde-move-done"
              onClick={() => {
                setArranging(false);
                setPicked([]);
              }}
            >
              Done
            </button>
          </div>
        </div>
      )}
      {packs.map((pack) => {
        const key = `${monster.id}|${pack.id}`;
        const up = standingIn(pack);
        const left = toAct(pack).length;
        const done = up.length > 0 && left === 0;
        const entries = packEntries(encounter, monster.id, pack.id);
        const others = packs.filter((other) => other.id !== pack.id);
        const who = packLabel(pack);
        return (
          <section class="pack" key={pack.id || 'loose'} data-drop={packDrop === key || undefined} data-done={done || undefined} aria-label={split ? pack.name : `${monster.name} horde`} {...dropProps(pack.id, key)}>
            <div class="pack-head">
              <button
                type="button"
                class="turn-box"
                aria-pressed={done}
                disabled={!up.length}
                aria-label={done ? `${who}: unmark turn` : `${who}: done, the rest hold back`}
                title={done ? 'Unmark this turn: every minion here may act again' : left < up.length ? `Done: the other ${left} hold back` : 'Done for this round'}
                onClick={() => setPackTurn(pack, !done)}
              >
                {done ? <Check size={17} strokeWidth={3} /> : null}
              </button>
              {split ? (
                <input
                  class="pack-name"
                  aria-label={`Rename ${pack.name}`}
                  value={pack.name}
                  style={{ width: `calc(${Math.max(4, pack.name.length)}ch + 14px)` }}
                  onChange={(e) => {
                    const name = e.currentTarget.value.trim() || pack.name;
                    patchEncounter(`${pack.name} renamed to ${name}`, (enc) => renamePack(enc, pack.id, name));
                  }}
                />
              ) : null}
              <span class="pack-count" aria-live="polite">
                <span class="pack-standing">
                  <b>{up.length}</b>
                  {up.length < pack.cards.length && <> of {pack.cards.length}</>} standing
                </span>
                {up.length > 0 &&
                  (done ? (
                    <em>done</em>
                  ) : (
                    left < up.length && (
                      <span class="pack-left">
                        <b>{left}</b> to act
                      </span>
                    )
                  ))}
              </span>
              <input
                class="pack-hit"
                type="text"
                inputMode="numeric"
                enterKeyHint="done"
                autoComplete="off"
                disabled={!up.length}
                placeholder={encounter.overkill ? 'Hit' : 'Kill #'}
                aria-label={encounter.overkill ? `Damage to ${who}: excess carries over (${die ? `d${die} each` : 'one per hit'}), then Enter` : `How many ${who} went down, then Enter`}
                title={encounter.overkill ? `Damage to this pack. Overkill: every ${die ?? '—'} damage fells one more` : 'How many went down, e.g. after an area attack'}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return;
                  e.preventDefault();
                  if (hitPack(pack, e.currentTarget.value)) e.currentTarget.value = '';
                }}
              />
              {split && (
                <button type="button" class="pack-more icon-btn" aria-expanded={packMenu === key} aria-label={`${pack.name} options`} title="Merge or split" onClick={() => setPackMenu(packMenu === key ? null : key)}>
                  <MoreHorizontal size={17} />
                </button>
              )}
            </div>
            {packMenu === key && (
              <div class="pack-menu" role="group" aria-label={`${pack.name} options`}>
                <span>Merge into</span>
                {others.map((other) => (
                  <button
                    type="button"
                    key={other.id || 'loose'}
                    onClick={() => {
                      setPackMenu(null);
                      const label = `${pack.name} merged into ${other.name}`;
                      notify(label, { undo: patchEncounter(label, (e) => mergePacks(e, monster.id, pack.id, other.id)) });
                    }}
                  >
                    {other.name}
                  </button>
                ))}
                {up.length > 1 && (
                  <button
                    type="button"
                    class="pack-split"
                    onClick={() => {
                      setPackMenu(null);
                      const label = `${pack.name} split in two`;
                      notify(label, { undo: patchEncounter(label, (e) => splitPack(e, monster.id, pack.id, uid())) });
                    }}
                  >
                    Split in half
                  </button>
                )}
              </div>
            )}
            <div class="horde-tokens" role="group" aria-label={arranging ? `${who}: tap to pick for moving` : `${who}: tap one to defeat it, again to bring it back. Arrow keys move, M to move between packs`}>
              {pack.cards.map((card, at) => {
                const dead = card.lane === 'defeated';
                const name = cardName(card);
                const chosen = here.includes(card.id);
                const state = dead ? 'defeated' : card.acted ? 'acted' : 'ready to act';
                // One tab stop per pack; arrow keys walk the tokens.
                return (
                  <button
                    type="button"
                    key={card.id}
                    tabIndex={at === 0 ? 0 : -1}
                    data-card={card.id}
                    class={`horde-token ${freshIds.has(card.id) ? 'is-fresh' : ''} ${stampIds.has(card.id) ? 'is-stamped' : ''}`}
                    data-state={dead ? 'down' : card.acted ? 'acted' : 'ready'}
                    data-picked={chosen || undefined}
                    data-conditions={card.conditions.length > 0 ? '' : undefined}
                    aria-pressed={arranging ? chosen : dead}
                    draggable
                    onDragStart={(e) => tokenDragStart(e, card)}
                    onDragEnd={() => {
                      setTokenDrag(null);
                      setPackDrop(null);
                    }}
                    aria-label={`${name}${card.conditions.length ? `, ${card.conditions.join(', ')}` : ''}, ${state}${arranging ? '' : dead ? ': tap to bring back' : ': tap to defeat'}`}
                    title={`${name} · ${state}${card.conditions.length ? ` · ${card.conditions.join(', ')}` : ''}${arranging ? '' : ` · ${dead ? 'Tap to bring back' : 'Any damage kills: tap to defeat'} · Drag to another pack`}`}
                    onClick={() => (arranging ? togglePick(card.id) : toggleMinion(card))}
                  >
                    {dead ? <Skull size={14} aria-hidden="true" /> : laneCards.indexOf(card) + 1}
                  </button>
                );
              })}
            </div>
            {split && attacks.length > 0 && (
              <div class="pack-rolls">
                {attacks.map((action) => (
                  <div class="pack-roll" key={action.id}>
                    <span>{action.name}</span>
                    {packRoll(pack, action)}
                  </div>
                ))}
              </div>
            )}
            {entries.length > 0 && (
              <ol class="pack-log" aria-label={`${who} this round`}>
                {entries.map((entry) => (
                  <li key={entry.id} data-miss={!entry.held && !entry.hits ? '' : undefined}>
                    {entry.held ? (
                      <span>
                        <b>{entry.cardIds.length}</b> held back
                      </span>
                    ) : (
                      <span>
                        {entry.cardIds.length}× {entry.action} <ArrowRight size={12} aria-hidden="true" /> <b>{entry.hits ? entry.total : 'miss'}</b>
                        {entry.hits !== undefined && entry.hits > 0 && entry.hits < entry.cardIds.length && <small> · {entry.cardIds.length - entry.hits} missed</small>}
                      </span>
                    )}
                    <button type="button" class="pack-log-undo" aria-label={entry.held ? 'Undo holding back' : `Take back ${entry.action} roll`} title="Take back: these minions may act again" onClick={() => undoPackRoll(entry)}>
                      <X size={13} />
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </section>
        );
      })}
      {tokenDrag && (
        <div class="pack-new-drop" data-drop={packDrop === `${monster.id}|new` || undefined} {...dropProps(null, `${monster.id}|new`)}>
          <Plus size={15} /> Drop here for a new pack
        </div>
      )}
    </div>
  );
}
