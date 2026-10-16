import type { Armor, Monster, MonsterKind } from '../lib/types';
import { gmgRows } from './gmg.ts';

// All 86 text-only official GMG monsters, provided via the Nimble 3rd Party
// Creator License. Monster values are read directly from the GMG v1 snapshot.
function levelOf(value: unknown): number {
  const v = String(value);
  if (v === '1/4') return 0.25;
  if (v === '1/3') return 1 / 3;
  if (v === '1/2') return 0.5;
  return Number(v) || 1;
}
function rowText(value: unknown): string {
  return typeof value === 'string' ? value : '';
}
function rowArray(value: unknown): unknown[][] {
  return Array.isArray(value) ? value.filter(Array.isArray) : [];
}
function nameslug(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z\d]+/g, '-')
    .replace(/^-|-$/g, '');
}

export const officialGmgMonsters: Monster[] = gmgRows.map((row): Monster => {
  const name = rowText(row[0]);
  const typeFlag = Number(row[5]);
  const kind: MonsterKind = typeFlag === 1 ? 'minion' : typeFlag === 2 ? 'legendary' : 'standard';
  const sourceActions = rowArray(row[8]);
  const sourceTraits = rowArray(row[7]);
  const lastStandText = rowText(row[11]);
  const lastStandValue = /(\d+)\s+more damage\b/i.exec(lastStandText);
  const saves =
    row[6] && typeof row[6] === 'object' && !Array.isArray(row[6])
      ? Object.entries(row[6])
          .map(([ability, bonus]) => `${ability.toUpperCase()}${Number(bonus) >= 0 ? '+'.repeat(Number(bonus)) : '−'.repeat(-Number(bonus))}`)
          .join(' · ')
      : undefined;
  return {
    id: `official-${nameslug(name)}`,
    name,
    level: levelOf(row[1]),
    armor: rowText(row[2]) as Armor,
    hp: typeof row[3] === 'number' ? row[3] : null,
    kind,
    family: rowText(row[4]),
    role: kind === 'legendary' ? 'Solo' : kind === 'minion' ? 'Minion' : 'Monster',
    saves,
    traits: sourceTraits.map(([title, description]) => ({ name: rowText(title), description: rowText(description) })),
    actions: sourceActions.map(([title, notation, description, range], i) => ({
      id: `action-${i}`,
      name: rowText(title),
      notation: rowText(notation) || undefined,
      description: rowText(description),
      range: typeof range === 'number' ? String(range) : undefined,
    })),
    actionInstructions: rowText(row[9]) || undefined,
    bloodied: rowText(row[10]) || undefined,
    lastStandText: lastStandText || undefined,
    lastStand: lastStandValue ? Number(lastStandValue[1]) : undefined,
    edition: 'first-printing',
    source: 'official',
    sourceUrl: 'https://nimble.nexus/u/nimble-co/monsters',
  };
});

// Read the bundled GMG v1 snapshot verbatim; keep stable IDs for saved encounters.
export const officialCatalog: Monster[] = [...officialGmgMonsters].sort((a, b) => a.name.localeCompare(b.name));

if (officialCatalog.length !== 86) throw new Error('Official GMG snapshot is incomplete.');
