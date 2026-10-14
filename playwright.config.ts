import { defineConfig } from '@playwright/test';
import { fileURLToPath } from 'node:url';

// E2E runs the real built client, not the dev server, so Vite's on-demand compilation and
// dependency re-optimisation cannot reload the page mid-scenario.
const BASE = 'http://127.0.0.1:4000';
// The camera every scenario's Chromium has: a synthetic dice tray (tests/e2e/fixtures/dicecam-tray.y4m, one still
// frame) that the dicecam shows once physical dice are on (docs/dicecam.md). No scenario sees it otherwise.
const TRAY = fileURLToPath(new URL('./tests/e2e/fixtures/dicecam-tray.y4m', import.meta.url));

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  forbidOnly: true,
  retries: 0,
  reporter: [['html', { open: 'never' }]],
  timeout: 120_000,
  expect: {
    timeout: 30_000,
    toHaveScreenshot: {
      maxDiffPixels: 0,
      animations: 'disabled',
      caret: 'hide',
      scale: 'css'
    }
  },
  use: {
    baseURL: BASE,
    trace: 'retain-on-failure',
    serviceWorkers: 'block',
    deviceScaleFactor: 1,
    timezoneId: 'UTC',
    locale: 'en-US',
    permissions: ['camera'],
    launchOptions: {
      args: [
        '--use-fake-device-for-media-stream',
        '--use-fake-ui-for-media-stream',
        `--use-file-for-fake-video-capture=${TRAY}`,
        '--font-render-hinting=none',
        '--disable-font-subpixel-positioning',
        '--disable-lcd-text',
        '--force-device-scale-factor=1',
        '--disable-gpu',
        '--use-gl=swiftshader'
      ]
    }
  },
  snapshotPathTemplate: '{testDir}/{testFileDir}/screenshots/{arg}{ext}',
  projects: [
    // Phone contexts are opened inside a scenario with tests/e2e/helpers/phone.ts, so there is
    // no separate phone project; every scenario starts from the table.
    { name: 'table', use: { browserName: 'chromium', viewport: { width: 1920, height: 1080 } } },
    {
      name: 'table-4k',
      testMatch: '**/*responsive*/*.spec.ts',
      use: { browserName: 'chromium', viewport: { width: 3840, height: 2160 } }
    }
  ],
  webServer: [
    {
      // `bun run test:e2e` builds first (see package.json build:e2e, which sets the VITE_* env);
      // Playwright only serves the finished build.
      command: 'bun run preview',
      url: BASE,
      timeout: 120_000,
      reuseExistingServer: false
    },
    {
      command: 'bun run relay',
      url: 'http://127.0.0.1:3001/health',
      timeout: 120_000,
      reuseExistingServer: false,
      env: { RELAY_PORT: '3001' }
    }
  ]
});
