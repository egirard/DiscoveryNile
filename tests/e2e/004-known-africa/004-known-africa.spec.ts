import { test, expect } from '@playwright/test';
import { TestStepHelper } from '../helpers/test-step-helper';

const PRINTED = 625 - 448; // the transcription's 626 and 447, corrected in the map editor (RQ-5, prompt 52)

test.describe('004 - Known Africa', () => {
  test('the pre-printed periphery of 1820 is drawn: terrain, rivers with their drainage numbers, and cataracts', async ({ page }, testInfo) => {
    const steps = new TestStepHelper(page, testInfo);
    steps.setMetadata(
      'Known Africa',
      'The periphery of the board known in 1820 is drawn from the manifest: desert across the north and down the south-west coast, the Abyssinian mountains, the Sudd, the Cape, the coastal veldt and jungle, the pre-printed rivers with the drainage number at each mouth, and the printed cataract on the Blue Nile. The interior stays blank. The board carries the corrections saved from the map editor (prompt 52): Zanzibar one hex west of where the photograph was read, its old hex sea. The marks are the board\'s own (prompt 52): veldt a V with a stem up from its vertex, veldt and swamp a little smaller than the mountain, a cataract one hatch across its river, and each port a brown square set half-way toward the sea so the terrain symbol in the middle of its hex stays readable, its name in the water beside it.'
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
        { spec: 'The marks are the board\'s own (prompt 52): veldt is a V with a stem, the cataract one hatch across the Blue Nile, and each port a brown square half-way from the centre of its hex toward the sea, clear of the river through it', check: async () => {
          await expect(page.locator('#sym-veldt path')).toHaveAttribute('d', 'M-0.42 -0.27 L0 0.31 L0.42 -0.27 M0 0.31 V-0.35');
          await expect(page.locator('#sym-swamp path')).toHaveAttribute('d', 'M-0.36 0.32 H0.36 M0 0.32 V-0.36 M-0.2 0.32 L-0.26 -0.19 M0.2 0.32 L0.26 -0.19');
          const across = (await page.getByTestId('cataract-c22r5').getAttribute('data-across'))!.split(',').map(Number);
          expect(Math.hypot(across[0], across[1])).toBeCloseTo(1, 1);
          await expect(page.getByTestId('cataract-c22r5').locator('line')).toHaveCount(2);
          await expect(page.getByTestId('mark-port-mombasa')).toHaveAttribute('data-at', '2.5'); // the sea to the east and south-east: the vertex between
          await expect(page.getByTestId('mark-port-khartoum')).toHaveAttribute('data-at', '6'); // the Niles come in from the south, the Nile runs off north-east
          await expect(page.getByTestId('mark-port-brass')).toHaveAttribute('data-at', '5'); // the Niger comes in from the north-east and leaves south-west
          await expect(page.getByTestId('mark-port-zanzibar')).toHaveAttribute('data-at', '2.5');
          await expect(page.getByTestId('mark-port-mombasa')).toHaveCSS('fill', 'rgb(107, 58, 44)');
          const hex = (await page.getByTestId('hex-c25r12').boundingBox())!, mark = (await page.getByTestId('mark-port-mombasa').boundingBox())!;
          const off = Math.hypot(mark.x + mark.width / 2 - (hex.x + hex.width / 2), mark.y + mark.height / 2 - (hex.y + hex.height / 2));
          expect(off).toBeGreaterThan(hex.width * 0.15); // off the centre, where the terrain symbol is
          expect(off).toBeLessThan(hex.width * 0.5); // and still inside the hex
          await expect(page.getByTestId('label-port-mombasa')).toHaveText('Mombasa');
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
