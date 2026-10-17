import { test, expect } from '@playwright/test';
import { TestStepHelper } from '../helpers/test-step-helper';

const PORTS = ['khartoum', 'mombasa', 'zanzibar', 'kilwa', 'quilimane', 'lourenco-marques', 'durban', 'port-elizabeth', 'capetown', 'benguela', 'luanda', 'calabar', 'brass'];
const MOUTHS = ['white-nile', 'niger', 'ogooue', 'congo', 'cunene', 'orange', 'limpopo', 'zambezi', 'rufiji'];

test.describe('033 - Map legibility', () => {
  test('ports are named in the sea beside them, Luanda stands on the coast, and rivers are named at their mouths', async ({ page }, testInfo) => {
    const steps = new TestStepHelper(page, testInfo);
    steps.setMetadata(
      'Map legibility',
      'The names on the map are for the players at the table, so they are placed where a reader at the south edge finds them: a port\'s name is placed on the map, in the sea beside its port on the side its mark takes (prompt 53), and read horizontally from there whichever way the board is turned; at the north and south edges it runs along the edge, in an unmarked margin around the land that the board keeps for the names at the coast, so Capetown\'s, Brass\'s and Mombasa\'s lie whole in the sea. Khartoum, inland, has its name to the east (the Nile\'s name has the north); Port Elizabeth\'s lies south of it, Calabar\'s south-west, down between the Niger\'s number and its hex. Luanda stands on the coast. Every river that reaches the sea carries its name at its mouth beside its drainage number.'
    );

    await page.goto('/table/?new=1&gameId=ABCDE&seed=1234');
    await expect(page.getByTestId('hex-grid')).toBeVisible();

    await steps.step('ports-named-in-the-sea', {
      description: 'The empty table: every port named beside it in the sea, the names at the coast in the margin around the land, Luanda on the coast, and the nine rivers that reach the sea named at their mouths',
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
        { spec: 'Each name is placed on the map (prompt 53): Khartoum\'s east of it (above, with north to the left), Port Elizabeth\'s south (to the right), Calabar\'s south-west (below and to the right), Capetown\'s west (centred below it), Mombasa\'s east-south-east (above and to the right)', check: async () => {
          const HEX: Record<string, string> = { khartoum: 'c20r1', 'port-elizabeth': 'c14r36', calabar: 'c4r8', capetown: 'c10r36', mombasa: 'c25r12' };
          const at = async (id: string) => (await page.getByTestId(`hex-${HEX[id]}`).boundingBox())!;
          const name = async (id: string) => (await page.getByTestId(`label-port-${id}`).boundingBox())!;
          const mid = (b: { x: number; y: number; width: number; height: number }) => ({ x: b.x + b.width / 2, y: b.y + b.height / 2 });
          const k = await at('khartoum'), kn = await name('khartoum');
          expect(mid(kn).y).toBeLessThan(k.y);
          expect(Math.abs(mid(kn).x - mid(k).x)).toBeLessThan(k.width / 4);
          await expect(page.getByTestId('label-port-khartoum')).toHaveAttribute('data-dir', '2');
          const pe = await at('port-elizabeth'), pen = await name('port-elizabeth');
          expect(pen.x).toBeGreaterThan(mid(pe).x);
          expect(Math.abs(mid(pen).y - mid(pe).y)).toBeLessThan(pe.height / 4);
          const c = await at('calabar'), n = await name('calabar');
          expect(n.x).toBeGreaterThan(mid(c).x);
          expect(mid(n).y).toBeGreaterThan(mid(c).y);
          const ct = await at('capetown'), ctn = await name('capetown');
          expect(ctn.y).toBeGreaterThan(mid(ct).y + ct.height / 4);
          expect(Math.abs(mid(ctn).x - mid(ct).x)).toBeLessThan(ct.width / 4);
          const m = await at('mombasa'), mn = await name('mombasa');
          expect(mid(mn).y).toBeLessThan(mid(m).y - m.height / 4);
          expect(mn.x).toBeGreaterThan(mid(m).x);
        } },
        { spec: 'The land is inset from the board\'s edge by an unmarked margin of about a hex, and the names at the coast lie whole within the board: Capetown\'s, Brass\'s, Mombasa\'s, Khartoum\'s and the White Nile\'s number', check: async () => {
          const grid = (await page.getByTestId('hex-grid').boundingBox())!;
          const north = (await page.getByTestId('hex-c20r1').boundingBox())!; // row 1 lies along the left edge
          const third = (await page.getByTestId('hex-c20r3').boundingBox())!;
          const r = (third.x - north.x) / 3; // rows are a radius and a half apart
          expect(north.x - grid.x).toBeGreaterThan(1.5 * r);
          expect(north.x - grid.x).toBeLessThan(2 * r);
          const west = (await page.getByTestId('hex-c2r8').boundingBox())!; // column 2 lies along the bottom edge
          expect(grid.y + grid.height - (west.y + west.height)).toBeGreaterThan(1.5 * r);
          for (const id of ['label-port-capetown', 'label-port-brass', 'label-port-mombasa', 'label-port-khartoum', 'drainage-white-nile']) {
            const b = (await page.getByTestId(id).boundingBox())!;
            expect(b.x, id).toBeGreaterThanOrEqual(grid.x - 1);
            expect(b.y, id).toBeGreaterThanOrEqual(grid.y - 1);
            expect(b.x + b.width, id).toBeLessThanOrEqual(grid.x + grid.width + 1);
            expect(b.y + b.height, id).toBeLessThanOrEqual(grid.y + grid.height + 1);
          }
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
