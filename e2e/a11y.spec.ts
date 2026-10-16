import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { addGoblin } from './helpers.ts';

/* WCAG A/AA checks (PRODUCT.md: AA contrast in both themes) on a running board
 * with the library open. */
for (const colorScheme of ['light', 'dark'] as const) {
  test(`no WCAG A/AA violations in the ${colorScheme} theme`, async ({ page }) => {
    await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
    await addGoblin(page);
    const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
  });
}
