import { test, expect } from '@playwright/test';
import { TestStepHelper } from '../helpers/test-step-helper';

const PRINTED = 625 - 448; // the transcription's 626 and 447, corrected in the map editor (RQ-5, prompt 52)

test.describe('004 - Known Africa', () => {
  test('the pre-printed periphery of 1820 is drawn: terrain, rivers with their drainage numbers, and cataracts', async ({ page }, testInfo) => {
    const steps = new TestStepHelper(page, testInfo);
    steps.setMetadata(
      'Known Africa',
      'The periphery of the board known in 1820 is drawn from the manifest: desert across the north and down the south-west coast, the Abyssinian mountains, the Sudd, the Cape, the coastal veldt and jungle, the pre-printed rivers with the drainage number at each mouth, and the printed cataract on the Blue Nile. The interior stays blank. The board carries the corrections saved from the map editor (prompt 52): Zanzibar one hex west of where the photograph was read, its old hex sea.'
    );

    await page.goto('/table/?new=1&gameId=ABCDE&seed=1234');

    await steps.step('known-africa', {
      description: 'The pre-printed terrain, rivers, drainage numbers and cataracts are shown; the interior is blank',
      verifications: [
        { spec: 'Every pre-printed hex (177) carries a terrain class and the 448 blank hexes do not', check: async () => {
          await expect(page.locator('[data-testid^="hex-c"]:not([data-terrain="blank"])')).toHaveCount(PRINTED);
          await expect(page.locator('[data-testid^="hex-c"][data-terrain="blank"]')).toHaveCount(448);
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
        { spec: 'The twelve pre-printed rivers are drawn, including both Niles meeting at Khartoum, and the thirteenth drawn in the editor', check: async () => {
          await expect(page.locator('[data-testid^="river-"]')).toHaveCount(13);
          for (const id of ['white-nile', 'blue-nile', 'niger', 'benue', 'ogooue', 'congo', 'cunene', 'orange', 'vaal', 'limpopo', 'zambezi', 'rufiji', 'river-13']) {
            await expect(page.getByTestId(`river-${id}`)).toBeAttached();
            // The Limpopo was cut back to its port hex in the editor: one point, no reach, until its course is drawn again.
            expect((await page.getByTestId(`river-${id}`).getAttribute('points'))!.split(' ').length).toBeGreaterThanOrEqual(id === 'limpopo' ? 1 : 2);
          }
        } },
        { spec: 'Each of the nine mouths shows its drainage number', check: async () => {
          const expected: Record<string, string> = { 'white-nile': '35', niger: '6', ogooue: '10', congo: '25', cunene: '10', orange: '14', limpopo: '13', zambezi: '16', rufiji: '10' };
          await expect(page.locator('[data-testid^="drainage-"]')).toHaveCount(9);
          for (const [id, n] of Object.entries(expected)) await expect(page.getByTestId(`drainage-${id}`)).toHaveText(n);
        } },
        { spec: 'The printed cataract on the Blue Nile is marked; the Congo\'s, read from the photograph, was taken off in the editor', check: async () => {
          await expect(page.locator('[data-testid^="cataract-"]')).toHaveCount(1);
          await expect(page.getByTestId('cataract-c22r5')).toHaveAttribute('aria-label', 'Cataract on the Blue Nile');
        } },
        { spec: 'The corrections saved from the map editor are on the board (prompt 52): Zanzibar is the port of c23r15 and c24r15 is sea; c18r26 is blank, c20r26 jungle, c19r30 veldt; the Ogooué and the Cunene reach a hex further', check: async () => {
          await expect(page.getByTestId('hex-c23r15')).toHaveAttribute('data-port', 'zanzibar');
          await expect(page.getByTestId('hex-c24r15')).toHaveCount(0);
          await expect(page.getByTestId('hex-c18r26')).toHaveAttribute('data-terrain', 'blank');
          await expect(page.getByTestId('hex-c20r26')).toHaveAttribute('data-terrain', 'jungle');
          await expect(page.getByTestId('hex-c19r30')).toHaveAttribute('data-terrain', 'veldt');
          expect((await page.getByTestId('river-ogooue').getAttribute('points'))!.split(' ')).toHaveLength(4); // the reach into the sea and three hexes
          expect((await page.getByTestId('river-cunene').getAttribute('points'))!.split(' ')).toHaveLength(4);
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
