import { expect, type Page, type TestInfo } from '@playwright/test';
import * as fs from 'node:fs';
import * as path from 'node:path';

export interface Verification {
  spec: string;
  check: () => Promise<void>;
}

interface JournalStep {
  title: string;
  image: string;
  specs: string[];
  actor: string;
}

export class ScenarioJournal {
  title = '';
  description = '';
  steps: JournalStep[] = [];
  count = 0; // shared across every helper (actor) in the scenario so screenshots number in order
}

/**
 * Asserts the interface fits: no document scroll, nothing marked `data-e2e-fit` leaves the
 * viewport or is clipped, no control is clipped, nothing marked `data-e2e-no-scroll` scrolls,
 * and on the table route nothing marked `data-e2e-private` is present. Every control is at
 * least the touch target the screen publishes as `--target` (12 mm at the configured diagonal,
 * never under 44 px); a control marked `data-e2e-hex-sized` is as big as the board's hexes
 * and is measured by the responsive scenario instead.
 */
export async function expectInterfaceToFit(page: Page) {
  const problems = await page.evaluate(async () => {
    await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
    const tolerance = 1;
    const root = document.querySelector<HTMLElement>('[data-e2e-layout]');
    if (!root) return ['missing [data-e2e-layout] root'];
    const failures: string[] = [];
    const label = (el: Element) => `${el.tagName.toLowerCase()}[${el.getAttribute('data-testid') || el.getAttribute('aria-label') || el.id || ''}]`;
    const visible = (el: HTMLElement) => {
      const s = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return s.display !== 'none' && s.visibility !== 'hidden' && r.width > 0 && r.height > 0;
    };
    const outside = (r: DOMRect) =>
      r.left < -tolerance || r.top < -tolerance || r.right > innerWidth + tolerance || r.bottom > innerHeight + tolerance;
    const clippedBy = (el: HTMLElement) => {
      const r = el.getBoundingClientRect();
      for (let a = el.parentElement; a && a !== root.parentElement; a = a.parentElement) {
        const s = getComputedStyle(a);
        if ([s.overflow, s.overflowX, s.overflowY].some((v) => v === 'hidden' || v === 'clip')) {
          const b = a.getBoundingClientRect();
          if (r.left < b.left - tolerance || r.top < b.top - tolerance || r.right > b.right + tolerance || r.bottom > b.bottom + tolerance)
            return label(a);
        }
      }
      return '';
    };

    const dw = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
    const dh = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
    if (dw > innerWidth + tolerance || dh > innerHeight + tolerance) failures.push(`document scrolls: ${dw}×${dh} in ${innerWidth}×${innerHeight}`);
    if (scrollX || scrollY) failures.push(`window scrolled to ${scrollX},${scrollY}`);

    for (const el of [root, ...root.querySelectorAll<HTMLElement>('[data-e2e-fit]')]) {
      if (!visible(el)) continue;
      if (outside(el.getBoundingClientRect())) failures.push(`${label(el)} leaves viewport`);
      const c = clippedBy(el);
      if (c) failures.push(`${label(el)} clipped by ${c}`);
    }
    const target = Math.max(44, parseFloat(getComputedStyle(root).getPropertyValue('--target')) || 0);
    for (const el of root.querySelectorAll<HTMLElement>('button, input, select, textarea, a[href], [role="button"]')) {
      if (!visible(el)) continue;
      const r = el.getBoundingClientRect();
      if (outside(r)) failures.push(`${label(el)} control leaves viewport`);
      const c = clippedBy(el);
      if (c) failures.push(`${label(el)} control clipped by ${c}`);
      if (!el.hasAttribute('data-e2e-hex-sized') && (r.width < target - tolerance || r.height < target - tolerance))
        failures.push(`${label(el)} control is ${r.width.toFixed(1)}×${r.height.toFixed(1)}px, under the ${target}px touch target`);
    }
    for (const el of root.querySelectorAll<HTMLElement>('[data-e2e-no-scroll]')) {
      if (!visible(el)) continue;
      if (el.scrollWidth > el.clientWidth + tolerance || el.scrollHeight > el.clientHeight + tolerance)
        failures.push(`${label(el)} scrolls internally: ${el.scrollWidth}×${el.scrollHeight} in ${el.clientWidth}×${el.clientHeight}`);
    }
    if (root.getAttribute('data-testid') === 'table') {
      const priv = root.querySelectorAll('[data-e2e-private]').length;
      if (priv) failures.push(`table exposes ${priv} private element(s)`);
    }
    return failures;
  });
  expect(problems, problems.join('\n')).toEqual([]);
}

export class TestStepHelper {
  private journal: ScenarioJournal;

  constructor(
    private page: Page,
    private testInfo: TestInfo,
    journal?: ScenarioJournal,
    private actor = 'Player'
  ) {
    this.journal = journal ?? new ScenarioJournal();
  }

  setMetadata(title: string, description: string) {
    this.journal.title = title;
    this.journal.description = description;
  }

  async step(id: string, options: { description: string; verifications: Verification[]; status?: string }) {
    for (const v of options.verifications) await v.check();
    await expect(this.page.locator('[role="status"][data-status]')).toHaveAttribute('data-status', options.status ?? 'synced');
    await this.page.bringToFront();
    await this.page.mouse.move(0, 0);
    await expectInterfaceToFit(this.page);

    const index = String(this.journal.count++).padStart(3, '0');
    const filename = `${index}-${id}-${this.testInfo.project.name}-${process.platform}.png`;
    await expect(this.page).toHaveScreenshot(filename);
    this.journal.steps.push({ title: options.description, image: `screenshots/${filename}`, specs: options.verifications.map((v) => v.spec), actor: this.actor });
  }

  /** Writes README.md next to the spec from the journal. Only the primary project writes it. */
  generateDocs() {
    if (this.testInfo.project.name !== 'table') return;
    let out = `# ${this.journal.title}\n\n${this.journal.description}\n\n`;
    out += `_Generated by the test step helper from \`${path.basename(this.testInfo.file)}\`. Do not edit by hand._\n\n`;
    this.journal.steps.forEach((step, i) => {
      out += `## ${i + 1}. ${step.title}\n\n**${step.actor}**\n\n![${step.title}](${step.image})\n\n**Verifications:**\n\n`;
      out += step.specs.map((s) => `- [x] ${s}`).join('\n') + '\n\n';
    });
    fs.writeFileSync(path.join(path.dirname(this.testInfo.file), 'README.md'), out.trimEnd() + '\n');
  }
}
