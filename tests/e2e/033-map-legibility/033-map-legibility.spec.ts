import { test, expect } from '@playwright/test';
import { TestStepHelper } from '../helpers/test-step-helper';

const PORTS = ['khartoum', 'mombasa', 'zanzibar', 'kilwa', 'quilimane', 'lourenco-marques', 'durban', 'port-elizabeth', 'capetown', 'benguela', 'luanda', 'calabar', 'brass'];
const MOUTHS = ['white-nile', 'niger', 'ogooue', 'congo', 'cunene', 'orange', 'limpopo', 'zambezi', 'rufiji'];

test.describe('033 - Map legibility', () => {
  test('ports are named in the sea beside them, Luanda stands on the coast, and rivers are named at their mouths', async ({ page }, testInfo) => {
    const steps = new TestStepHelper(page, testInfo);
    steps.setMetadata(
      'Map legibility',
      'The names on the map are for the players at the table, so they are placed where a reader at the south edge finds them: a port\'s name sits in the sea beside its port, level with it where the coast allows, above the east coast (the sea is up when north is to the left), to the south of Khartoum and of Port Elizabeth and at Calabar\'s south-west corner. Luanda stands on the coast. Every river that reaches the sea carries its name at its mouth beside its drainage number.'
    );

    await page.goto('/table/?new=1&gameId=ABCDE&seed=1234');
    await expect(page.getByTestId('hex-grid')).toBeVisible();

    await steps.step('ports-named-in-the-sea', {
      description: 'The empty table: every port named beside it in the sea, Luanda on the coast, and the nine rivers that reach the sea named at their mouths',
      verifications: [
        { spec: 'Luanda is the port of c7r19, a coastal hex (c6r19 is sea), and c8r19 is plain veldt', check: async () => {
          await expect(page.getByTestId('hex-c7r19')).toHaveAttribute('data-port', 'luanda');
          await expect(page.getByTestId('hex-c6r19')).toHaveCount(0);
          await expect(page.getByTestId('hex-c8r19')).not.toHaveAttribute('data-port', 'luanda');
        } },
        { spec: 'All thirteen ports carry a name label, upright for the south edge, placed by its own offset', check: async () => {
          for (const id of PORTS) await expect(page.getByTestId(`label-port-${id}`)).toBeVisible();
          const boxes = await Promise.all(PORTS.map((id) => page.getByTestId(`label-port-${id}`).boundingBox()));
          for (const box of boxes) expect(box!.width).toBeGreaterThan(box!.height); // a horizontal line of text, not rotated
        } },
        { spec: 'Khartoum\'s and Port Elizabeth\'s names lie to the south (screen right) of their ports, Calabar\'s below and to the right', check: async () => {
          const HEX: Record<string, string> = { khartoum: 'c20r1', 'port-elizabeth': 'c14r36', calabar: 'c4r8' };
          const at = async (id: string) => (await page.getByTestId(`hex-${HEX[id]}`).boundingBox())!;
          const name = async (id: string) => (await page.getByTestId(`label-port-${id}`).boundingBox())!;
          const k = await at('khartoum');
          expect((await name('khartoum')).x).toBeGreaterThan(k.x + k.width / 2);
          expect((await name('port-elizabeth')).x).toBeGreaterThan((await at('port-elizabeth')).x + (await at('port-elizabeth')).width / 2);
          const c = await at('calabar'), n = await name('calabar');
          expect(n.x).toBeGreaterThan(c.x + c.width / 2);
          expect(n.y).toBeGreaterThan(c.y + c.height / 2);
        } },
        { spec: 'Each river with a mouth is named there, beside its drainage number', check: async () => {
          for (const id of MOUTHS) {
            await expect(page.getByTestId(`label-river-${id}`)).toBeVisible();
            const n = (await page.getByTestId(`label-river-${id}`).boundingBox())!;
            const d = (await page.getByTestId(`drainage-${id}`).boundingBox())!;
            expect(Math.abs(n.y + n.height / 2 - (d.y + d.height / 2))).toBeLessThan(d.height);
          }
          await expect(page.getByTestId('label-river-blue-nile')).toHaveCount(0);
        } }
      ]
    });

    steps.generateDocs();
  });
});
