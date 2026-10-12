import { test, expect } from '@playwright/test';
import { TestStepHelper } from '../helpers/test-step-helper';

const PRINTED = 626 - 447;

test.describe('004 - Known Africa', () => {
  test('the pre-printed periphery of 1820 is drawn: terrain, rivers with their drainage numbers, and cataracts', async ({ page }, testInfo) => {
    const steps = new TestStepHelper(page, testInfo);
    steps.setMetadata(
      'Known Africa',
      'The periphery of the board known in 1820 is drawn from the manifest: desert across the north and down the south-west coast, the Abyssinian mountains, the Sudd, the Cape, the coastal veldt and jungle, the twelve pre-printed rivers with the drainage number at each mouth, and the two printed cataracts. The interior stays blank.'
    );

    await page.goto('/table/?new=1&gameId=ABCDE&seed=1234');

    await steps.step('known-africa', {
      description: 'The pre-printed terrain, rivers, drainage numbers and cataracts are shown; the interior is blank',
      verifications: [
        { spec: 'Every pre-printed hex (179) carries a terrain class and the 447 blank hexes do not', check: async () => {
          await expect(page.locator('[data-testid^="hex-c"]:not([data-terrain="blank"])')).toHaveCount(PRINTED);
          await expect(page.locator('[data-testid^="hex-c"][data-terrain="blank"]')).toHaveCount(447);
        } },
        { spec: 'Desert hexes are filled brown and carry no symbol; every other printed terrain draws its symbol', check: async () => {
          await expect(page.locator('[data-testid^="hex-c"][data-terrain="desert"]')).toHaveCount(49);
          await expect(page.locator('[data-testid^="terrain-"]')).toHaveCount(PRINTED - 49);
          await expect(page.getByTestId('hex-c20r1')).toHaveAttribute('data-terrain', 'desert');
          await expect(page.getByTestId('hex-c20r1')).toHaveCSS('fill', 'rgb(168, 97, 74)');
        } },
        { spec: 'Spot checks: Khartoum is desert, the Sudd is swamp, Abyssinia is mountain, the west coast is jungle, Brass has jungle-swamp beside it, Capetown is veldt', check: async () => {
          await expect(page.getByTestId('terrain-c18r6')).toHaveAttribute('data-terrain', 'swamp');
          await expect(page.getByTestId('terrain-c23r1')).toHaveAttribute('data-terrain', 'mountain');
          await expect(page.getByTestId('terrain-c8r22')).toHaveAttribute('data-terrain', 'jungle');
          await expect(page.getByTestId('terrain-c3r8')).toHaveAttribute('data-terrain', 'jungle-swamp');
          await expect(page.getByTestId('terrain-c10r36')).toHaveAttribute('data-terrain', 'veldt');
          await expect(page.getByTestId('terrain-c3r8').locator('use')).toHaveCount(2);
        } },
        { spec: 'The twelve pre-printed rivers are drawn, including both Niles meeting at Khartoum', check: async () => {
          await expect(page.locator('[data-testid^="river-"]')).toHaveCount(12);
          for (const id of ['white-nile', 'blue-nile', 'niger', 'benue', 'ogooue', 'congo', 'cunene', 'orange', 'vaal', 'limpopo', 'zambezi', 'rufiji']) {
            await expect(page.getByTestId(`river-${id}`)).toBeAttached();
            expect((await page.getByTestId(`river-${id}`).getAttribute('points'))!.split(' ').length).toBeGreaterThanOrEqual(2);
          }
        } },
        { spec: 'Each of the nine mouths shows its drainage number', check: async () => {
          const expected: Record<string, string> = { 'white-nile': '35', niger: '6', ogooue: '10', congo: '25', cunene: '10', orange: '14', limpopo: '13', zambezi: '16', rufiji: '10' };
          await expect(page.locator('[data-testid^="drainage-"]')).toHaveCount(9);
          for (const [id, n] of Object.entries(expected)) await expect(page.getByTestId(`drainage-${id}`)).toHaveText(n);
        } },
        { spec: 'The two printed cataracts are marked: on the Blue Nile and on the Congo', check: async () => {
          await expect(page.locator('[data-testid^="cataract-"]')).toHaveCount(2);
          await expect(page.getByTestId('cataract-c22r5')).toHaveAttribute('aria-label', 'Cataract on the Blue Nile');
          await expect(page.getByTestId('cataract-c7r15')).toHaveAttribute('aria-label', 'Cataract on the Congo');
        } },
        { spec: 'The thirteen ports are still marked and six seats are free', check: async () => {
          await expect(page.locator('[data-testid^="port-"]')).toHaveCount(13);
          await expect(page.locator('[data-testid^="seat-join-"]')).toHaveCount(6);
        } }
      ]
    });

    steps.generateDocs();
  });
});
