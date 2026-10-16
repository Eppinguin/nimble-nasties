import type { Hero } from './types.ts';
import { uid } from './board.ts';

const boundedLevel = (n: number) => Math.max(1, Math.min(20, Math.round(Number.isFinite(n) ? n : 1)));
export const isUniformParty = (heroes: Hero[]): boolean => heroes.length < 2 || heroes.every((hero) => hero.level === heroes[0].level);
export const partyLevel = (heroes: Hero[]): number => heroes[0]?.level ?? 1;

/** Quick setup deliberately preserves existing names/IDs and sets a shared level.
 * Switches between quick/detailed modes themselves never change hero data. */
export function setQuickParty(heroes: Hero[], size: number, level: number): Hero[] {
  const count = Math.max(1, Math.min(20, Math.round(Number.isFinite(size) ? size : 1)));
  const desiredLevel = boundedLevel(level);
  return Array.from({ length: count }, (_, index) => {
    const existing = heroes[index];
    return existing
      ? { ...existing, level: desiredLevel }
      : {
          id: uid(),
          name: `Hero ${index + 1}`,
          level: desiredLevel,
          hp: 28,
          maxHp: 28,
          defense: 2,
        };
  });
}
export function setHeroLevel(heroes: Hero[], id: string, level: number): Hero[] {
  const desired = boundedLevel(level);
  return heroes.map((hero) => (hero.id === id ? { ...hero, level: desired } : hero));
}

/** A party of `size` heroes at `level`, keeping your heroes' names where it can;
 *  your own party untouched (mixed levels and all) when it already matches. */
export function partyFor(heroes: Hero[], size: number, level: number): Hero[] {
  if (heroes.length === size && heroes.every((hero) => hero.level === level)) return heroes;
  return setQuickParty(heroes, size, level);
}
