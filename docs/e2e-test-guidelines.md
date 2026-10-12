# E2E Test Guidelines

Playwright scenarios are the primary proof of every player-visible change. **Every commit includes a new or extended scenario** (see [commit-contract.md](commit-contract.md)). This document describes how to write one.

## What a scenario proves

A scenario is a numbered, deterministic, real-browser journey through the application. At each step it:

1. performs an action a player could perform;
2. verifies the resulting state semantically (DOM and `window.__TABLETOP__`);
3. checks that the interface fits the viewport with nothing clipped;
4. takes a zero-tolerance screenshot; and
5. records the step in a journal from which the scenario's `README.md` is generated.

The generated README, with its screenshots, is living documentation that anyone can read to understand what the application does after that commit.

## Core principles

### 1. Baselines are committed and reviewed

Every scenario commits its baseline screenshots. CI compares; it never regenerates. The author generates baselines locally, **looks at every image**, and commits them with the change. Never update a baseline merely because CI differs; find out why.

### 2. Interact from the bottom seat

Players sit on any side of the table, so seat-specific elements exist per edge. Scenarios interact from the **bottom** edge unless the scenario is specifically about another seat, so player-facing UI reads naturally in screenshots.

```typescript
await page.getByTestId('seat-join-bottom-1').click();      // ✅
await page.getByTestId('seat-join').click();             // ❌ no seat id
```

### 3. Deterministic initialization

Everything random is seeded. Scenarios pin the seed, the clock, the locale, the timezone, the viewport, fonts, and GPU rendering flags. Screenshots are compared with `maxDiffPixels: 0`.

```typescript
await page.goto('/table/?new=1&gameId=ABCDE&seed=1234');   // fresh game, pinned room code, pinned seed
```

Room codes are random in normal use, so a scenario always pins one with `gameId=`; the application drops these one-shot parameters from the URL after use so a reload resumes the same game.

When a scenario needs particular outcomes, `dice=6,6,6,6,1,1,1,1,6` scripts the first die rolls of the game's main PRNG stream in the order the rules resolve them, and `dice-hunting=4,1` those of another stream (one per rule added since 014, see [implementation-plan.md](implementation-plan.md), Randomness); after the script the seeded generator takes over. Shuffles never read a script. The scripts are committed with `game/created`, so replay reproduces them, and the scenario records what each value drives in a comment next to the `goto`.

Never monkey-patch `Date.now` or `Math.random` from a test; the application must accept a seed by design (see [state-and-persistence.md](state-and-persistence.md)).

### 4. No arbitrary delays, no retries

`waitForTimeout`, `setTimeout`, and polling loops are forbidden. Wait for a semantic condition:

```typescript
await expect(page.getByTestId('token')).toHaveCount(4);
await expect(page.locator('[role="status"][data-status]')).toHaveAttribute('data-status', 'synced');
```

`retries: 0` in the config. A flaky scenario is a bug in the application or the scenario, never something to retry through.

### 5. Semantic verification before pixels

Every step lists **verifications**: a human-readable spec and a check. The checks run before the screenshot, and the specs become the checklist in the generated README. A screenshot without verifications is not a step.

### 6. The interface fits

Every step asserts that the document does not scroll, no marked region leaves the viewport or is clipped by an ancestor, no control is clipped, and no marked region scrolls internally. On the table route it additionally asserts that no element marked private is present. This is `expectInterfaceToFit` in the step helper; it needs the markers below to be present in the DOM.

| Marker | On |
|---|---|
| `data-e2e-layout` | The root element of the screen |
| `data-e2e-fit` | Any container that must be completely visible (board, rails, panels) |
| `data-e2e-no-scroll` | Any container that must never scroll internally |
| `data-e2e-status-area` | The connection / turn status region |
| `data-e2e-private` | Anything that shows one seat's private information |

## Layout of a scenario

```
tests/e2e/
├── helpers/
│   ├── test-step-helper.ts     # TestStepHelper, ScenarioJournal, expectInterfaceToFit
│   ├── seats.ts                # takeSeat(page, edge, name)
│   └── phone.ts                # openHand(browser, gameId, seat)
├── 001-app-shell-and-seats/
│   ├── 001-app-shell-and-seats.spec.ts
│   ├── README.md               # GENERATED — never hand-edited
│   └── screenshots/
│       ├── 000-empty-table-table-linux.png
│       └── 001-bottom-seat-taken-table-linux.png
└── README.md                   # scenario map (hand-written)
```

Numbers are assigned sequentially as slices land and are never renumbered. Extend an existing scenario when a slice naturally continues its story; otherwise add the next number. The scenario map in `docs/implementation-plan.md` is the plan; `tests/e2e/README.md` is the reality.

## The step helper

```typescript
import { test, expect } from '@playwright/test';
import { TestStepHelper } from '../helpers/test-step-helper';

test.describe('003 - Taking a seat', () => {
  test('a player takes the bottom seat and sees their rail', async ({ page }, testInfo) => {
    const steps = new TestStepHelper(page, testInfo);
    steps.setMetadata(
      'Taking a seat',
      'A player at the bottom edge takes a seat and the table shows their rail.'
    );

    await page.goto('/table/?new=1&gameId=ABCDE&seed=1234');

    await steps.step('empty-table', {
      description: 'The table shows four empty seats',
      verifications: [
        { spec: 'Four seat rails are visible', check: async () => {
          await expect(page.getByTestId(/^seat-rail-/)).toHaveCount(4);
        } },
        { spec: 'No seat is taken', check: async () => {
          const state = await page.evaluate(() => window.__TABLETOP__.getState());
          expect(state.seats.filter((s) => s.uid)).toHaveLength(0);
        } },
      ],
    });

    await page.getByTestId('seat-join-bottom-1').click();

    await steps.step('bottom-seat-taken', {
      description: 'The bottom seat is taken and its rail faces the player',
      verifications: [
        { spec: 'The bottom rail shows the player icon', check: async () => {
          await expect(page.getByTestId('seat-rail-bottom-1')).toHaveAttribute('data-taken', 'true');
        } },
        { spec: 'The bottom rail is not rotated', check: async () => {
          await expect(page.getByTestId('seat-rail-bottom-1')).toHaveCSS('rotate', '0deg');
        } },
      ],
    });

    steps.generateDocs();
  });
});
```

`step(id, { description, verifications, status? })`:

1. runs every verification `check`;
2. waits for `[role="status"][data-status]` to equal `status` (default `synced`);
3. moves the mouse to `(0,0)` and brings the page to front;
4. runs `expectInterfaceToFit`;
5. takes `toHaveScreenshot('NNN-id-<project>-linux.png')`; and
6. appends the step to the journal.

`generateDocs()` writes `README.md` next to the spec from the journal: title, description, and for each step a heading, the screenshot, and the verification specs as a ticked checklist. It runs only for the primary project so the README has one gallery.

## Multi-device scenarios

- One isolated `browser.newContext()` per device. Never share storage.
- Open a phone with `openPhone(browser, url)` from `helpers/phone.ts` (393×852, touch), using the seat's QR link `href` read from the table plus `&name=Tester&auto=1` (honoured in E2E builds only).
- Assert each action from the actor's view **and** the other clients' converged views.
- Each context gets its own `TestStepHelper` sharing one `ScenarioJournal` so the README interleaves table and phone steps with an actor label.

## Firebase scenarios

Only when the project uses the Firebase backend:

- `test:e2e` wraps Playwright in `firebase emulators:exec --project <project>-e2e`.
- `webServer.env` sets fixed emulator hosts, ports, and a fake public config. Production Firebase is never contacted.
- Fixed uids are supplied to the Auth emulator so `actorUid` values are stable in screenshots and logs.
- Reconnect scenarios use `page.context().setOffline(true)` or the repository's `disconnect()`, never by killing the emulator.

## Playwright configuration

```typescript
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
    toHaveScreenshot: { maxDiffPixels: 0, animations: 'disabled', caret: 'hide', scale: 'css' },
  },
  use: {
    baseURL: 'http://127.0.0.1:4000',   // the built client, served by vite preview
    trace: 'retain-on-failure',
    serviceWorkers: 'block',
    deviceScaleFactor: 1,
    timezoneId: 'UTC',
    locale: 'en-US',
    launchOptions: {
      args: [
        '--font-render-hinting=none', '--disable-font-subpixel-positioning', '--disable-lcd-text',
        '--force-device-scale-factor=1', '--disable-gpu', '--use-gl=swiftshader',
      ],
    },
  },
  snapshotPathTemplate: '{testDir}/{testFileDir}/screenshots/{arg}{ext}',
  projects: [
    { name: 'table', use: { browserName: 'chromium', viewport: { width: 1920, height: 1080 } } },
    { name: 'table-4k', testMatch: '**/0NN-responsive-*/*.spec.ts',
      use: { browserName: 'chromium', viewport: { width: 3840, height: 2160 } } },
  ],
  webServer: [
    // `bun run test:e2e` runs `build:e2e` first (it sets VITE_E2E, VITE_GIT_HASH, VITE_RELAY_URL);
    // Playwright only serves the finished build and the relay.
    { command: 'bun run preview', url: 'http://127.0.0.1:4000', timeout: 120_000, reuseExistingServer: false },
    { command: 'bun run relay', url: 'http://127.0.0.1:3001/health', timeout: 120_000, reuseExistingServer: false },
  ],
});
```

- Scenarios run against the **production build** (`vite preview`), never the dev server, so Vite's on-demand compilation cannot reload a page mid-scenario.
- `table` at 1920×1080 stands in for the 27" table and is the primary project; the walkthrough README is generated from it.
- `table-4k` stands in for the 55" table and runs only for the responsive scenario(s), because 4K baselines are large.
- There is no phone project: a scenario that needs a phone opens a phone-sized context itself with `helpers/phone.ts`, so every scenario starts from the table.
- Baselines are generated on **Linux** (CI's platform). A developer on macOS generates them through the `update-baselines` workflow (see [ci-and-deployment.md](ci-and-deployment.md)), never locally.

## Animation and motion

`animations: 'disabled'` freezes CSS animations and transitions for screenshots, but application logic must not depend on animation timing either: reloading during an animation renders the settled state, and animation duration never decides legality or ordering. The application honours `prefers-reduced-motion`.

## Writing a new scenario

1. Create `tests/e2e/NNN-<name>/NNN-<name>.spec.ts` with the next number.
2. Write the steps with the helper; every step has at least one verification.
3. `bun run test:e2e -- --grep NNN` — it fails on missing baselines.
4. `bun run test:e2e:update -- --grep NNN` — generates baselines and the README. (`test:e2e:only` skips the build when iterating on a scenario without app changes.)
5. **Open every screenshot** and confirm it shows what the step claims.
6. `bun run test:e2e` — the full suite, to catch unintended baseline changes elsewhere.
7. Add the scenario to `tests/e2e/README.md`.
8. Commit spec, screenshots, README, and scenario map together with the feature.

## Updating an existing scenario

1. Run it and read the diff images in `test-results/`.
2. If the change is intended, regenerate baselines for that scenario only and inspect them.
3. Commit the new baselines in the **same commit** as the UI change, and say why in the commit message.

## Checklist

- [ ] Directory `tests/e2e/NNN-<name>/` with the next sequential number
- [ ] Uses `TestStepHelper`; every step has verifications
- [ ] Interacts from the bottom seat unless the story needs another
- [ ] Seed and all other inputs pinned; no `Date.now`, `Math.random`, or clock dependence
- [ ] No `waitForTimeout`, no retries, no `.only`, no `.skip`
- [ ] Waits for `data-status="synced"` (or the intended status) at each step
- [ ] Fit markers present so `expectInterfaceToFit` is meaningful
- [ ] Baselines generated on Linux, visually reviewed, committed
- [ ] `README.md` generated, not edited
- [ ] `tests/e2e/README.md` scenario map updated
- [ ] Full suite passes with zero-pixel tolerance
