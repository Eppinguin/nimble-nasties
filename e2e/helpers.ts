import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';

export const hpField = (page: Page) => page.locator('input[aria-label*="HP. Append"]').first();
export const undoButton = (page: Page) => page.getByRole('group', { name: 'Undo history' }).getByRole('button').first();

export async function open(page: Page, path = '/') {
  await page.goto(path);
  await expect(page.getByRole('region', { name: 'Combat controls' })).toBeVisible();
}

export async function addMonster(page: Page, name: string) {
  await page.keyboard.press('/');
  await page.getByRole('textbox', { name: 'Search monsters' }).fill(name);
  await page.getByRole('button', { name: `Add ${name}`, exact: true }).click();
}

export async function addGoblin(page: Page) {
  await open(page);
  await addMonster(page, 'Goblin');
  await expect(hpField(page)).toBeVisible();
}

/** Types a command into the first HP field and applies it. */
export async function hit(page: Page, command: string) {
  await hpField(page).fill(command);
  await hpField(page).press('Enter');
}

export const openEncounterMenu = (page: Page) => page.getByRole('button', { name: /^Current encounter:/ }).click();
