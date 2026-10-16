import test from 'node:test';
import assert from 'node:assert/strict';
import { gmgRows } from './gmg.ts';

// Exact projection of the 86 GMG records (source file at Nimble Nexus Github,
// verified 2026-10-15). This guards against accidental corruption or truncation.
test('bundled GMG snapshot is all 86 official monsters', () => {
  assert.equal(gmgRows.length, 86);
  assert.equal(new Set(gmgRows.map((row) => row[0])).size, 86);
  assert.equal(
    gmgRows.reduce((sum, row) => sum + (Array.isArray(row[8]) ? row[8].length : 0), 0),
    142,
  );
});
test('GMG snapshot source checksum matches checked projection', () => {
  const source = JSON.stringify(gmgRows);
  let hash = 2166136261;
  for (let i = 0; i < source.length; i++) hash = Math.imul(hash ^ source.charCodeAt(i), 16777619) >>> 0;
  assert.equal(hash.toString(16), 'dffcc327');
});
