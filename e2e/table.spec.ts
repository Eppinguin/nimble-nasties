import { expect, test } from '@playwright/test';
import { addGoblin, hit, hpField, open, openEncounterMenu, undoButton } from './helpers.ts';

test('a hit is undone, and undo survives a reload', async ({ page }) => {
  await addGoblin(page);
  const full = await hpField(page).inputValue();
  await hit(page, '!3');
  await expect(hpField(page)).toHaveValue(String(Number(full) - 3));

  await page.reload();
  await expect(hpField(page)).toHaveValue(String(Number(full) - 3));
  await expect(undoButton(page)).toHaveAccessibleName(/^Undo: 3 crit damage/);
  await undoButton(page).click();
  await expect(hpField(page)).toHaveValue(full);
});

test('the HP field reads heals, exact HP and edits of the shown number, and Esc discards', async ({ page }) => {
  await addGoblin(page);
  const full = Number(await hpField(page).inputValue());
  await hit(page, '-4');
  await expect(hpField(page)).toHaveValue(String(full - 4));
  await hit(page, '+2');
  await expect(hpField(page)).toHaveValue(String(full - 2));
  await hit(page, '=3');
  await expect(hpField(page)).toHaveValue('3');
  await hit(page, `3+1`);
  await expect(hpField(page)).toHaveValue('4');

  await hpField(page).fill('2');
  await hpField(page).press('Escape');
  await expect(hpField(page)).toHaveValue('4');

  await hit(page, 'nonsense');
  await expect(page.getByRole('status')).toContainText('=18 set HP');
});

test('opening a second tab leaves the first tab its undo history', async ({ page, context }) => {
  await addGoblin(page);
  // A brand-new encounter is stored in a shape loading tidies up.
  await openEncounterMenu(page);
  await page.getByRole('button', { name: 'New encounter' }).click();
  await expect(undoButton(page)).toHaveAccessibleName(/created$/);
  const second = await context.newPage();
  await open(second);
  await expect(second.getByRole('button', { name: /^Current encounter: Encounter 2/ })).toBeVisible();
  await page.bringToFront();
  await expect(page.getByText('Updated with changes from another tab')).toHaveCount(0);
  await expect(undoButton(page)).toHaveAccessibleName('Undo: Encounter 2 created');
});

test('Escape closes one layer at a time', async ({ page }) => {
  await open(page);
  await page.keyboard.press('/');
  const library = page.getByRole('complementary', { name: 'Monster library and encounter budget' });
  await expect(library).toBeVisible();
  await page.getByRole('button', { name: 'Encounter building rules' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(library).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(library).toHaveCount(0);
});

test('D toggles the dice tray, types once the roll is edited, and leaves HP fields alone', async ({ page }) => {
  await addGoblin(page);
  const expression = page.getByRole('textbox', { name: 'Dice expression' });
  await page.keyboard.press('Escape');
  await page.keyboard.press('d');
  await expect(expression).toBeFocused();
  await page.keyboard.press('d');
  await expect(expression).toHaveCount(0);

  // Once the expression is edited, `d` types.
  await page.keyboard.press('d');
  await expect(expression).toBeFocused();
  for (let i = 0; i < 4; i++) await page.keyboard.press('Backspace');
  await page.keyboard.type('d6');
  await expect(expression).toHaveValue('d6');
  await expression.press('Escape');
  await expect(expression).toHaveCount(0);

  await hpField(page).press('d');
  await expect(expression).toHaveCount(0);
});

test('board shortcuts wait while a dialog is open', async ({ page }) => {
  await addGoblin(page);
  await page.keyboard.press('Escape');
  const full = await hpField(page).inputValue();
  await hit(page, '!3');
  await openEncounterMenu(page);
  await page
    .getByRole('button', { name: /^Manage / })
    .first()
    .click();
  await page.getByRole('button', { name: 'Notes' }).click();
  const dialog = page.getByRole('dialog', { name: 'Session notes' });
  await expect(dialog).toBeVisible();

  await page.locator('body').press('ControlOrMeta+z');
  await page.locator('body').press('/');
  await expect(page.getByRole('complementary', { name: 'Monster library and encounter budget' })).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(hpField(page)).toHaveValue(String(Number(full) - 3));
});

test('a phone runs the same table', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await addGoblin(page);
  const full = Number(await hpField(page).inputValue());
  await hit(page, '!2');
  await expect(hpField(page)).toHaveValue(String(full - 2));
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test('a stat block whose creatures have all acted steps back until next round', async ({ page }) => {
  await addGoblin(page);
  await page.getByRole('button', { name: 'Add another', exact: true }).click();
  const lane = page.locator('section.monster-lane').first();
  const boxes = lane.getByRole('button', { name: /^Mark turn for/ });
  await expect(boxes).toHaveCount(2);

  await boxes.first().click();
  await expect(lane).not.toHaveAttribute('data-spent');
  await lane.getByRole('button', { name: /^Mark turn for/ }).click();
  await expect(lane).toHaveAttribute('data-spent', 'true');
  await expect(lane.getByRole('heading', { level: 2 })).toHaveText(/all acted this round/);

  await page.getByRole('button', { name: /^Next round/ }).click();
  await expect(lane).not.toHaveAttribute('data-spent');
});
