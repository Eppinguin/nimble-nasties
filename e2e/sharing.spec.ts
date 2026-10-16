import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { shareUrl } from '../src/lib/share.ts';
import type { Monster } from '../src/lib/types.ts';
import { addGoblin, hit, hpField, open, openEncounterMenu } from './helpers.ts';

const brew: Monster = {
  id: 'homebrew-0f8fad5b-d9cb-469f-a165-70867728950e',
  name: 'Gutter Imp',
  level: 1,
  kind: 'standard',
  armor: 'none',
  hp: 12,
  family: 'Homebrew',
  role: 'Custom',
  traits: [{ name: 'Sneaky', description: 'Hides after it attacks.' }],
  actions: [{ id: 'a1', name: 'Claw', notation: '1d6+2', description: '' }],
  source: 'homebrew',
  edition: 'unknown',
};

test('a shared monster link opens, saves and joins the encounter', async ({ page }) => {
  const url = await shareUrl(brew, 'http://localhost/');
  await open(page, `/${url.slice(url.indexOf('#'))}`);
  const dialog = page.getByRole('dialog', { name: 'Gutter Imp' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Save & add' }).click();
  await expect(hpField(page)).toHaveValue('12');
  // The fragment is cleared, so a reload doesn't ask again.
  await page.reload();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(hpField(page)).toHaveValue('12');
});

test('a backup restores encounters in a fresh browser', async ({ page, browser }) => {
  await addGoblin(page);
  await page.keyboard.press('Escape');
  await hit(page, '!3');
  const hp = await hpField(page).inputValue();
  await openEncounterMenu(page);
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Back up' }).click()]);
  const file = await download.path();
  expect(JSON.parse(await readFile(file, 'utf8')).format).toBe('nimble-nasties-v1');

  const fresh = await browser.newPage();
  await open(fresh);
  await expect(hpField(fresh)).toHaveCount(0);
  await openEncounterMenu(fresh);
  const [chooser] = await Promise.all([fresh.waitForEvent('filechooser'), fresh.getByRole('button', { name: 'Import', exact: true }).click()]);
  await chooser.setFiles(file);
  await expect(fresh.getByRole('status')).toContainText('1 encounter imported');
  await expect(hpField(fresh)).toHaveValue(hp);
  await fresh.close();
});
