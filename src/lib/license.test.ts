import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { ATTRIBUTION, FREE_NOTICE_LEAD, FREE_NOTICE_REST } from './license.ts';

// Nimble 3rd Party Creator License v2.0: both texts are required word for word.
const notice = `${FREE_NOTICE_LEAD} ${FREE_NOTICE_REST} nimbleRPG.com.`;

test('attribution and free-tool notice match the license exactly', () => {
  assert.equal(ATTRIBUTION, 'Nimble Nasties is an independent product published under the Nimble 3rd Party Creator License. Nimble © Nimble Co.');
  assert.equal(notice, 'This tool is free to use for anyone who already owns the content, is trying the system out, or cannot afford to buy it right now. If you enjoy Nimble and are able, please support the game by purchasing the official content at nimbleRPG.com.');
});

test('banner, About and rules dialog use the license texts, never a paraphrase', () => {
  for (const file of ['src/components/SupportBanner.tsx', 'src/dialogs/AboutDialog.tsx', 'src/dialogs/RulesDialog.tsx']) {
    const source = readFileSync(file, 'utf8');
    assert.equal(source.match(/\{ATTRIBUTION\}/g)?.length, 1, file);
    assert.equal(source.match(/<FreeNotice\b/g)?.length, 1, file);
    assert.doesNotMatch(source, /not affiliated|independent product published/, file);
  }
});

test('README carries both texts', () => {
  const readme = readFileSync('README.md', 'utf8').replace(/\[(nimbleRPG\.com)\]\([^)]*\)/g, '$1');
  assert.ok(readme.includes(ATTRIBUTION));
  assert.ok(readme.includes(notice));
});
