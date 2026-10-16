import { expect, test } from '@playwright/test';
import { addGoblin, hit, hpField, open } from './helpers.ts';

test('once loaded, the table keeps working offline', async ({ page, context }) => {
  await addGoblin(page);
  await page.keyboard.press('Escape');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) await new Promise((resolve) => navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }));
  });
  const full = Number(await hpField(page).inputValue());

  await context.setOffline(true);
  await open(page);
  await hit(page, '!2');
  await expect(hpField(page)).toHaveValue(String(full - 2));
  // Self-hosted fonts come from the cache too.
  expect(await page.evaluate(() => document.fonts.check('900 16px Alegreya'))).toBe(true);
});
