import type { Monster } from './types.ts';
import { normalizeEncounter, uid } from './board.ts';
import type { NemesisEncounter } from './board.ts';
import { stamped } from './homebrew.ts';
import { monstersInNexusDocument } from './nexus.ts';
import { readRules } from './rulesets.ts';
import { isMonsterFile, monstersInFile } from './share.ts';

export type ImportResult = { kind: 'monsters'; monsters: Monster[] } | { kind: 'encounters'; encounters: NemesisEncounter[]; homebrew: Monster[]; newer: number };

const obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' ? (v as Record<string, unknown>) : {});

/** What a chosen JSON file holds: monsters (a Nimble Nasties monster file or a saved
 *  Nimble Nexus API response), or encounters (an export, a backup, or one bare
 *  encounter) with the homebrew they bring along. Imported encounters get fresh ids,
 *  so importing twice adds two copies. `newer` counts encounters on a rule set this
 *  build doesn't know yet; they are skipped. Everything read goes through the same
 *  validation as stored data. */
export function readImport(parsed: unknown, library: Monster[]): ImportResult {
  const nexus = monstersInNexusDocument(parsed);
  if (nexus) return { kind: 'monsters', monsters: nexus };
  if (isMonsterFile(parsed)) return { kind: 'monsters', monsters: monstersInFile(parsed) };
  const raw = obj(parsed);
  const homebrew = Array.isArray(raw.customMonsters) ? monstersInFile({ customMonsters: raw.customMonsters }).map((m) => stamped(m, 'file')) : [];
  const entries = Array.isArray(raw.encounters) ? raw.encounters : [parsed];
  const newer = entries.filter((e) => 'unknown' in readRules(obj(e).rules)).length;
  const encounters = entries
    .map((e) => normalizeEncounter(e, [...library, ...homebrew]))
    .filter((e): e is NemesisEncounter => e !== null)
    .map((e) => ({ ...e, id: uid() }));
  return { kind: 'encounters', encounters, homebrew, newer };
}
