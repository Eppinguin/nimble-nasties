import type { NemesisCard, NemesisEncounter } from './board.ts';

/** Minion packs (GMG v1 p. 26): minions move and attack together, so the
 * table thinks in packs, not creatures. A pack is a set of one stat block's
 * minions standing together. For theater of the mind it is also the range
 * that overkill damage carries over in.
 *
 * Until the GM splits a horde, every minion sits in one implicit pack (no
 * `packId`). Each action of the stat block draws on the same pool: one action
 * per minion per round, whichever action it uses. */
export interface Pack {
  id: string;
  monsterId: string;
  name: string;
}
export interface PackRoll {
  id: string;
  monsterId: string;
  /** '' is the implicit pack. */
  packId: string;
  /** Minions this entry marked acted; undoing it hands exactly these back. */
  cardIds: string[];
  action?: string;
  total?: number;
  hits?: number;
  /** A "the rest hold back" entry has no roll. */
  held?: boolean;
}
export interface LanePack {
  id: string;
  name: string;
  cards: NemesisCard[];
  implicit: boolean;
}

const IMPLICIT = '';
const standing = (card: NemesisCard) => card.lane !== 'defeated';
const ready = (card: NemesisCard) => standing(card) && !card.acted;

/** A lane's packs in order, each with its minions. Empty packs drop out;
 * minions without a (known) pack form the implicit pack, listed last. */
export function lanePacks(encounter: NemesisEncounter, monsterId: string): LanePack[] {
  const cards = encounter.cards.filter((card) => card.monsterId === monsterId);
  const named = (encounter.packs ?? []).filter((pack) => pack.monsterId === monsterId);
  const known = new Set(named.map((pack) => pack.id));
  const result: LanePack[] = named.map((pack) => ({ id: pack.id, name: pack.name, cards: cards.filter((card) => card.packId === pack.id), implicit: false })).filter((pack) => pack.cards.length);
  const loose = cards.filter((card) => !card.packId || !known.has(card.packId));
  if (loose.length || !result.length) result.push({ id: IMPLICIT, name: nextPackName(result.map((pack) => pack.name)), cards: loose, implicit: true });
  return result;
}

export function packOf(encounter: NemesisEncounter, card: NemesisCard): string {
  return card.packId && (encounter.packs ?? []).some((pack) => pack.id === card.packId) ? card.packId : IMPLICIT;
}

export function nextPackName(taken: string[]): string {
  for (let i = 0; i < 26; i++) {
    const name = `Pack ${String.fromCharCode(65 + i)}`;
    if (!taken.includes(name)) return name;
  }
  return `Pack ${taken.length + 1}`;
}

/** Minions in a pack that have not acted this round. */
/** This round's log for one pack, oldest first. */
export const packEntries = (encounter: NemesisEncounter, monsterId: string, packId: string) => (encounter.packLog ?? []).filter((entry) => entry.monsterId === monsterId && entry.packId === packId);
export const toAct = (pack: LanePack) => pack.cards.filter(ready);
export const standingIn = (pack: LanePack) => pack.cards.filter(standing);

/** Drop packs nobody stands in any more, and log entries for them. */
export function prunePacks(encounter: NemesisEncounter): NemesisEncounter {
  const used = new Set(encounter.cards.map((card) => card.packId).filter(Boolean));
  const packs = (encounter.packs ?? []).filter((pack) => used.has(pack.id));
  const live = new Set([IMPLICIT, ...packs.map((pack) => pack.id)]);
  return { ...encounter, packs, packLog: (encounter.packLog ?? []).filter((entry) => live.has(entry.packId)) };
}

function inPack(encounter: NemesisEncounter, monsterId: string, packId: string) {
  return (card: NemesisCard) => card.monsterId === monsterId && packOf(encounter, card) === packId;
}

/** Mark the first `count` ready minions of a pack acted and log the roll.
 * With none ready the roll is still logged, just without marking anyone. */
export function recordPackRoll(encounter: NemesisEncounter, monsterId: string, packId: string, count: number, roll: { id: string; action: string; total: number; hits: number }): NemesisEncounter {
  const chosen = encounter.cards
    .filter((card) => inPack(encounter, monsterId, packId)(card) && ready(card))
    .slice(0, Math.max(0, count))
    .map((card) => card.id);
  // Minions that already acted can still be rolled for (the GM's call); that roll marks nobody.
  return {
    ...encounter,
    cards: encounter.cards.map((card) => (chosen.includes(card.id) ? { ...card, acted: true } : card)),
    packLog: [...(encounter.packLog ?? []), { id: roll.id, monsterId, packId, cardIds: chosen, action: roll.action, total: roll.total, hits: roll.hits }],
  };
}

/** The pack's turn box: done marks the rest as holding back; undone hands
 * every minion of the pack its action back and clears the pack's log. */
export function setPackDone(encounter: NemesisEncounter, monsterId: string, packId: string, done: boolean, entryId: string): NemesisEncounter {
  const member = inPack(encounter, monsterId, packId);
  if (!done) {
    return {
      ...encounter,
      cards: encounter.cards.map((card) => (member(card) && standing(card) ? { ...card, acted: false } : card)),
      packLog: (encounter.packLog ?? []).filter((entry) => !(entry.monsterId === monsterId && entry.packId === packId)),
    };
  }
  const rest = encounter.cards.filter((card) => member(card) && ready(card)).map((card) => card.id);
  if (!rest.length) return encounter;
  return {
    ...encounter,
    cards: encounter.cards.map((card) => (rest.includes(card.id) ? { ...card, acted: true } : card)),
    packLog: [...(encounter.packLog ?? []), { id: entryId, monsterId, packId, cardIds: rest, held: true }],
  };
}

export function undoPackEntry(encounter: NemesisEncounter, entryId: string): NemesisEncounter {
  const entry = (encounter.packLog ?? []).find((item) => item.id === entryId);
  if (!entry) return encounter;
  return {
    ...encounter,
    cards: encounter.cards.map((card) => (entry.cardIds.includes(card.id) ? { ...card, acted: false } : card)),
    packLog: (encounter.packLog ?? []).filter((item) => item.id !== entryId),
  };
}

/** How many minions a hit on a pack kills. Any damage kills one; with the
 * overkill variant the die size is each minion's durability and the excess
 * carries over: 20 damage fells two d10 minions or five d4s. */
export function hitKills(damage: number, die: number | undefined, overkill: boolean): number {
  if (!(damage > 0)) return 0;
  if (!overkill || !die) return 1;
  return Math.max(1, Math.floor(damage / die));
}

/** Defeat `count` minions of a pack, those still to act first, so the
 * "to act" pool stays honest. Returns the encounter and who fell. */
export function defeatInPack(encounter: NemesisEncounter, monsterId: string, packId: string, count: number): { encounter: NemesisEncounter; fallen: string[] } {
  const members = encounter.cards.filter((card) => inPack(encounter, monsterId, packId)(card) && standing(card));
  const ordered = [...members.filter((card) => !card.acted), ...members.filter((card) => card.acted)];
  const fallen = ordered.slice(0, Math.max(0, count)).map((card) => card.id);
  return { fallen, encounter: { ...encounter, cards: encounter.cards.map((card) => (fallen.includes(card.id) ? { ...card, hp: 0, lane: 'defeated' } : card)) } };
}

/** Move minions into a pack, or into a new one when `target` is null. The
 * first split names the existing horde too, so both packs read as packs. */
export function moveToPack(encounter: NemesisEncounter, monsterId: string, cardIds: string[], target: string | null, newPackId: string): { encounter: NemesisEncounter; packId: string } {
  let packs = [...(encounter.packs ?? [])];
  let cards = encounter.cards;
  const loose = cards.filter((card) => card.monsterId === monsterId && packOf(encounter, card) === IMPLICIT);
  const others = lanePacks(encounter, monsterId).filter((pack) => !pack.implicit);
  // Give the implicit pack a real identity before anyone leaves it.
  if (loose.length && (target === null || target === IMPLICIT || others.length)) {
    const id = `${newPackId}-a`;
    packs.push({ id, monsterId, name: nextPackName(others.map((pack) => pack.name)) });
    cards = cards.map((card) => (loose.includes(card) ? { ...card, packId: id } : card));
    if (target === IMPLICIT) target = id;
  }
  let packId = target ?? '';
  if (target === null) {
    packId = newPackId;
    packs.push({ id: packId, monsterId, name: nextPackName(packs.filter((pack) => pack.monsterId === monsterId).map((pack) => pack.name)) });
  }
  // A minion that already acted keeps that: moving is positioning, not a turn.
  cards = cards.map((card) => (cardIds.includes(card.id) ? { ...card, packId } : card));
  return { encounter: prunePacks({ ...encounter, packs, cards }), packId };
}

export function renamePack(encounter: NemesisEncounter, packId: string, name: string): NemesisEncounter {
  return { ...encounter, packs: (encounter.packs ?? []).map((pack) => (pack.id === packId ? { ...pack, name } : pack)) };
}

export function mergePacks(encounter: NemesisEncounter, monsterId: string, from: string, into: string): NemesisEncounter {
  const moving = encounter.cards.filter(inPack(encounter, monsterId, from)).map((card) => card.id);
  const merged = moveToPack(encounter, monsterId, moving, into, `${from}-merge`).encounter;
  return prunePacks({ ...merged, packLog: (merged.packLog ?? []).map((entry) => (entry.monsterId === monsterId && entry.packId === from ? { ...entry, packId: into } : entry)) });
}

/** Split a pack in two, standing minions shared out evenly. */
export function splitPack(encounter: NemesisEncounter, monsterId: string, packId: string, newPackId: string): NemesisEncounter {
  const members = encounter.cards.filter(inPack(encounter, monsterId, packId));
  const up = members.filter(standing);
  const leaving = up.slice(Math.ceil(up.length / 2)).map((card) => card.id);
  if (!leaving.length) return encounter;
  return moveToPack(encounter, monsterId, leaving, null, newPackId).encounter;
}

/** Summoned minions appear together, so they arrive as their own pack. When
 * the lane already has minions, both groups become named packs. */
export function arriveAsPack(encounter: NemesisEncounter, monsterId: string, fresh: NemesisCard[], newPackId: string): NemesisEncounter {
  const existing = encounter.cards.some((card) => card.monsterId === monsterId && standing(card));
  const withFresh = { ...encounter, cards: [...encounter.cards, ...fresh] };
  if (!existing) return withFresh;
  return moveToPack(
    withFresh,
    monsterId,
    fresh.map((card) => card.id),
    null,
    newPackId,
  ).encounter;
}

/** Die size of a minion stat block's attack, e.g. 6 for `1d6`. */
export function minionDie(notation: string | undefined): number | undefined {
  const match = /d(\d+)/i.exec(notation ?? '');
  return match ? Number(match[1]) : undefined;
}
