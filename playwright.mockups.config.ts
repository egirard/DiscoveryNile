import { defineConfig } from '@playwright/test';
import base from './playwright.config';

// The screen mockups (docs/screen-mockups.md): pictures of the table's layout at several screen sizes, taken from the
// E2E build with the scenarios' browser settings. Not part of the verifier: run `bun run docs:mockups` after a change
// to the layout and commit the pictures with it.
export default defineConfig({
  ...base,
  testDir: './tests/mockups',
  reporter: [['list']],
  projects: [{ name: 'mockups', use: { browserName: 'chromium', viewport: { width: 1920, height: 1080 } } }]
});
