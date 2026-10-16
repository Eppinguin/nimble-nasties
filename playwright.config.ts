import { defineConfig, devices } from '@playwright/test';

/* Browser tests for the table-side flows the rules tests can't reach: the HP field,
 * undo, reloads, a second tab, keyboard layers, sharing, backups, phones and
 * accessibility on the dev server; offline play on a production build, the only
 * place the service worker runs. `pnpm test:e2e` */
const CI = !!process.env.CI;
export default defineConfig({
  testDir: 'e2e',
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  reporter: CI ? 'github' : 'list',
  use: { trace: 'on-first-retry' },
  projects: [
    { name: 'chromium', testIgnore: /offline\.spec/, use: { ...devices['Desktop Chrome'], baseURL: 'http://localhost:5199' } },
    { name: 'offline', testMatch: /offline\.spec/, use: { ...devices['Desktop Chrome'], baseURL: 'http://localhost:5198' } },
  ],
  webServer: [
    {
      command: 'pnpm exec vite --port 5199 --strictPort',
      url: 'http://localhost:5199',
      reuseExistingServer: !CI,
    },
    {
      command: 'pnpm exec vite build --outDir dist-e2e --emptyOutDir --logLevel warn && pnpm exec vite preview --outDir dist-e2e --port 5198 --strictPort',
      url: 'http://localhost:5198',
      reuseExistingServer: !CI,
      timeout: 120_000,
    },
  ],
});
