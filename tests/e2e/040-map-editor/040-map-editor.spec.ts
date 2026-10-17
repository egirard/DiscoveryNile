import { test, expect } from '@playwright/test';
import { TestStepHelper } from '../helpers/test-step-helper';

const SERVER = 'http://127.0.0.1:3002';

test.describe('040 - Map editor', () => {
  test('a hex misread from the photograph is repainted in the editor and the board is saved to the capture server', async ({ page }, testInfo) => {
    const steps = new TestStepHelper(page, testInfo);
    steps.setMetadata(
      'Map editor',
      'The board was transcribed from a photograph of the 1978 map and some hexes were misread (RQ-5). The map editor at /editor/ is a tool of its own, apart from the table: the board\'s window drawn north up as the table draws it, with the same symbols, rivers, ports and names (prompt 52), the sea hexes inside the window drawn too, a brush of eight terrains, blank and sea, the rivers listed with a course tool that adds a hex at either end with a tap, a cataract tool and the river\'s fields, a single hex editor showing the hex tapped with its terrain among the game\'s symbols, a tap on one changing it, and six spokes, blue where a river leaves it, each a tap to add or clear that river edge, a spoke toward the sea making the hex a river\'s mouth, the changes listed with a take-back each, and Save sending the whole board to the diagnostics capture server as a save command, which writes board.json in the source tree for the dev server to pick up. A port and a river hex stay land whatever the brush.'
    );

    // No capture server runs in E2E: the save command is answered here, as the server would, and its body is kept.
    const saves: unknown[] = [];
    await page.route(`${SERVER}/**`, async (route) => {
      const req = route.request();
      if (req.method() === 'POST' && req.url().endsWith('/diag/map-editor/command')) {
        saves.push(req.postDataJSON());
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ saved: 'src/lib/features/map/board.json', changes: 1 }) });
      } else {
        await route.fulfill({ status: 404, body: 'not found' });
      }
    });

    await page.goto(`/editor/?diag-server=${SERVER}`);
    await expect(page.getByTestId('editor-grid')).toBeVisible();

    await steps.step('editor-opened', {
      description: 'The editor shows the board\'s window north up, 24 hexes by 36 as the table shows it with no sea beyond the land but an unmarked margin around it for the names at the coast, the sea hexes inside it drawn dark, with the pre-printed terrain, the rivers and the ports named as the game names them; the counts read 625 land hexes and 450 blank, the brushes wait, the capture server is named, and there is nothing to save',
      verifications: [
        { spec: 'The window is the land\'s bounding box, columns 2 to 25 and rows 1 to 36 (prompt 52): no sea north of Khartoum, west of Brass or east of Mombasa; 625 hexes are land and 450 blank (RQ-5); Luanda stands on a veldt hex', check: async () => {
          await expect(page.locator('[data-testid^="edit-hex-"]')).toHaveCount(24 * 36);
          for (const id of ['c2r1', 'c25r1', 'c2r36', 'c25r36', 'c20r1']) await expect(page.getByTestId(`edit-hex-${id}`)).toBeAttached();
          for (const id of ['c1r1', 'c26r1', 'c20r0', 'c10r37', 'c0r8', 'c26r12']) await expect(page.getByTestId(`edit-hex-${id}`)).toHaveCount(0);
          await expect(page.locator('[data-testid^="edit-hex-"][data-kind="land"]')).toHaveCount(625);
          await expect(page.getByTestId('editor-counts')).toHaveAttribute('data-land', '625');
          await expect(page.getByTestId('editor-counts')).toHaveAttribute('data-blank', '450');
          await expect(page.getByTestId('edit-hex-c7r19')).toHaveAttribute('data-terrain', 'veldt');
          await expect(page.getByTestId('edit-hex-c7r19')).toHaveAttribute('data-port', 'luanda');
          await expect(page.getByTestId('edit-hex-c6r19')).toHaveAttribute('data-kind', 'sea');
        } },
        { spec: 'An unmarked margin of about a hex lies around the land (prompt 53), and the names at the coast lie in the sea as they do on the table: Capetown\'s west of its hex along the bottom row, Port Elizabeth\'s centred below it, Mombasa\'s to the east, Brass\'s to the west', check: async () => {
          const grid = (await page.getByTestId('editor-grid').boundingBox())!;
          const corner = (await page.getByTestId('edit-hex-c2r2').boundingBox())!; // an even row: not shifted
          const r = ((await page.getByTestId('edit-hex-c2r4').boundingBox())!.y - corner.y) / 3; // rows are a radius and a half apart
          expect(corner.x - grid.x).toBeGreaterThan(1.5 * r);
          expect(corner.x - grid.x).toBeLessThan(2 * r);
          const top = (await page.getByTestId('edit-hex-c2r1').boundingBox())!;
          expect(top.y - grid.y).toBeGreaterThan(1.5 * r);
          const box = async (id: string) => (await page.getByTestId(id).boundingBox())!;
          const mid = (b: { x: number; y: number; width: number; height: number }) => ({ x: b.x + b.width / 2, y: b.y + b.height / 2 });
          const cape = await box('edit-hex-c10r36'), capeName = await box('label-port-capetown');
          expect(capeName.x + capeName.width).toBeLessThan(mid(cape).x);
          expect(Math.abs(mid(capeName).y - mid(cape).y)).toBeLessThan(r / 4);
          const pe = await box('edit-hex-c14r36'), peName = await box('label-port-port-elizabeth');
          expect(peName.y).toBeGreaterThan(mid(pe).y + r / 4);
          expect(Math.abs(mid(peName).x - mid(pe).x)).toBeLessThan(r / 4);
          expect(peName.y + peName.height).toBeLessThanOrEqual(grid.y + grid.height + 1);
          const mombasa = await box('edit-hex-c25r12'), mombasaName = await box('label-port-mombasa');
          expect(mombasaName.x).toBeGreaterThan(mid(mombasa).x);
          const brass = await box('edit-hex-c2r8'), brassName = await box('label-port-brass');
          expect(brassName.x + brassName.width).toBeLessThan(mid(brass).x);
          await expect(page.getByTestId('label-port-capetown')).toHaveAttribute('text-anchor', 'end');
          await expect(page.getByTestId('label-port-port-elizabeth')).toHaveAttribute('text-anchor', 'middle');
        } },
        { spec: 'The ports, rivers and numbers are labelled as the game labels them (prompt 52): the same marks and names, Zanzibar\'s mark toward the sea, the Niger\'s 6 at its mouth, the cataract one hatch', check: async () => {
          await expect(page.getByTestId('label-port-zanzibar')).toHaveText('Zanzibar');
          await expect(page.getByTestId('mark-port-zanzibar')).toHaveAttribute('data-at', '2.5');
          await expect(page.getByTestId('mark-port-brass')).toHaveAttribute('data-at', '5');
          await expect(page.locator('[data-testid^="label-port-"]')).toHaveCount(13);
          await expect(page.getByTestId('drainage-niger')).toHaveText('6');
          await expect(page.getByTestId('label-river-niger')).toHaveText('Niger');
          await expect(page.locator('[data-testid^="drainage-"]')).toHaveCount(9);
          await expect(page.getByTestId('cataract-c22r5').locator('line')).toHaveCount(2);
        } },
        { spec: 'Ten brushes are offered and none is chosen; the server is named; Save is disabled with no change to save', check: async () => {
          await expect(page.locator('[data-testid^="brush-"]')).toHaveCount(10);
          await expect(page.locator('[data-testid^="brush-"][aria-pressed="true"]')).toHaveCount(0);
          await expect(page.getByTestId('editor-server')).toHaveAttribute('data-server', SERVER);
          await expect(page.getByTestId('editor-changes')).toHaveAttribute('data-count', '0');
          await expect(page.getByTestId('save-board')).toBeDisabled();
          await expect(page.getByTestId('selected-hex')).toHaveAttribute('data-hex', 'none');
        } }
      ]
    });

    await page.getByTestId('brush-jungle').click();
    await page.getByTestId('edit-hex-c8r20').click();

    await steps.step('hex-repainted', {
      description: 'The jungle brush is chosen and tapped onto c8r20, a veldt hex by Luanda: the hex turns jungle with a dashed outline, the change is listed with a take-back, the hex panel says what it was, and Save is offered',
      verifications: [
        { spec: 'c8r20 is jungle now, outlined as changed; the hex panel reads jungle, was veldt', check: async () => {
          await expect(page.getByTestId('brush-jungle')).toHaveAttribute('aria-pressed', 'true');
          await expect(page.getByTestId('edit-hex-c8r20')).toHaveAttribute('data-terrain', 'jungle');
          await expect(page.getByTestId('changed-c8r20')).toBeVisible();
          await expect(page.getByTestId('selected-hex')).toHaveAttribute('data-hex', 'c8r20');
          await expect(page.getByTestId('selected-hex')).toHaveAttribute('data-terrain', 'jungle');
          await expect(page.getByTestId('selected-hex')).toContainText('was veldt');
          await expect(page.getByTestId('hex-terrain-jungle')).toHaveAttribute('aria-pressed', 'true'); // the hex editor shows its terrain (prompt 51)
          await expect(page.getByTestId('hex-terrain-veldt')).toHaveAttribute('aria-pressed', 'false');
        } },
        { spec: 'The change is listed as veldt → jungle with a take-back, the counts hold, and Save is enabled', check: async () => {
          await expect(page.getByTestId('editor-changes')).toHaveAttribute('data-count', '1');
          await expect(page.getByTestId('change-c8r20')).toContainText('c8r20: veldt → jungle');
          await expect(page.getByTestId('undo-c8r20')).toBeVisible();
          await expect(page.getByTestId('editor-counts')).toHaveAttribute('data-land', '625');
          await expect(page.getByTestId('save-board')).toBeEnabled();
          await expect(page.getByTestId('editor-status')).toHaveAttribute('data-status', 'edited');
        } }
      ],
      status: 'edited'
    });

    await page.getByTestId('brush-sea').click();
    await page.getByTestId('edit-hex-c7r19').click();

    await steps.step('sea-refused-at-a-port', {
      description: 'The sea brush tapped onto Luanda\'s hex is refused: a port stays land, the message says so, and the one change stands',
      verifications: [
        { spec: 'Luanda\'s hex keeps its veldt and its port; the message names the port; the changes are still one', check: async () => {
          await expect(page.getByTestId('editor-status')).toHaveText('c7r19 is the port of Luanda: it stays land');
          await expect(page.getByTestId('edit-hex-c7r19')).toHaveAttribute('data-terrain', 'veldt');
          await expect(page.getByTestId('edit-hex-c7r19')).toHaveAttribute('data-port', 'luanda');
          await expect(page.getByTestId('editor-changes')).toHaveAttribute('data-count', '1');
          await expect(page.getByTestId('selected-hex')).toHaveAttribute('data-hex', 'c7r19');
        } }
      ],
      status: 'edited'
    });

    await page.getByTestId('hex-terrain-mountain').click();

    await steps.step('terrain-from-the-hex-editor', {
      description: 'Luanda\'s hex is still the one chosen: in the hex editor its terrain, veldt, is marked among the game\'s terrain symbols, and a tap on the mountain symbol changes it on the map at once, the port staying',
      verifications: [
        { spec: 'c7r19 is mountain now with its port; the mountain symbol is marked in the hex editor and the change is listed', check: async () => {
          await expect(page.getByTestId('edit-hex-c7r19')).toHaveAttribute('data-terrain', 'mountain');
          await expect(page.getByTestId('edit-hex-c7r19')).toHaveAttribute('data-port', 'luanda');
          await expect(page.getByTestId('hex-terrain-mountain')).toHaveAttribute('aria-pressed', 'true');
          await expect(page.getByTestId('selected-hex')).toHaveAttribute('data-terrain', 'mountain');
          await expect(page.getByTestId('change-c7r19')).toContainText('c7r19: veldt → mountain');
          await expect(page.getByTestId('editor-changes')).toHaveAttribute('data-count', '2');
        } }
      ],
      status: 'edited'
    });

    // Rivers (prompt 48): the Benue, which ends at the blank c3r6, is drawn one hex further and renamed.
    await page.getByTestId('river-select').selectOption('benue');
    await page.getByTestId('tool-river').click();
    await expect(page.getByTestId('river-candidate-c4r6')).toBeVisible();
    await page.getByTestId('edit-hex-c4r6').click();
    await page.getByTestId('river-name').fill('Benue River');

    await steps.step('river-extended', {
      description: 'The Benue is chosen from the list of rivers and the course tool taken: the hexes a tap would add glow at either end of its course; a tap on c4r6 beyond its inland end adds it, the course is drawn through, and the river is renamed in its fields; the change is listed for the river',
      verifications: [
        { spec: 'The Benue\'s course now runs c2r6, c3r6, c4r6 and is drawn brighter as the chosen river; the next hexes to add glow', check: async () => {
          await expect(page.getByTestId('river-select')).toHaveValue('benue');
          await expect(page.getByTestId('tool-river')).toHaveAttribute('aria-pressed', 'true');
          await expect(page.getByTestId('river-benue')).toHaveAttribute('data-hexes', 'c2r6,c3r6,c4r6');
          await expect(page.getByTestId('river-candidate-c5r6')).toBeVisible();
          await expect(page.getByTestId('river-candidate-c4r6')).toHaveCount(0);
          await expect(page.getByTestId('river-fields')).toHaveAttribute('data-river', 'benue');
          await expect(page.getByTestId('river-joins')).toHaveValue('niger');
        } },
        { spec: 'The change list holds the two hexes and the river: renamed and one hex longer', check: async () => {
          await expect(page.getByTestId('editor-changes')).toHaveAttribute('data-count', '3');
          await expect(page.getByTestId('change-river-benue')).toContainText('Benue River: named Benue River; +c4r6');
          await expect(page.getByTestId('undo-river-benue')).toBeVisible();
        } }
      ],
      status: 'edited'
    });

    await page.getByTestId('tool-cataract').click();
    await page.getByTestId('edit-hex-c3r6').click();

    await steps.step('cataract-marked', {
      description: 'The cataract tool tapped on c3r6, a hex of the Benue\'s course, marks a cataract there, drawn on the map and added to the river\'s change',
      verifications: [
        { spec: 'A cataract stands on c3r6 and the river\'s change says so', check: async () => {
          await expect(page.getByTestId('cataract-c3r6').locator('line')).toHaveCount(2);
          await expect(page.getByTestId('change-river-benue')).toContainText('cataract at c3r6');
          await expect(page.getByTestId('editor-changes')).toHaveAttribute('data-count', '3');
        } }
      ],
      status: 'edited'
    });

    await page.getByTestId('river-add').click();
    await page.getByTestId('edit-hex-c12r12').click();
    await page.getByTestId('edit-hex-c13r12').click();
    await page.getByTestId('river-drainage').fill('9');

    await steps.step('river-added', {
      description: 'A new river is added and chosen with the course tool in hand: two taps lay its course from c12r12 to c13r12, a drainage number is given, and it joins the list and the changes as added',
      verifications: [
        { spec: 'The thirteenth river runs c12r12, c13r12 with drainage 9, drawn with its number at the mouth; the list has thirteen rivers and the changes four', check: async () => {
          await expect(page.getByTestId('river-select')).toHaveAttribute('data-count', '13');
          await expect(page.getByTestId('river-select')).toHaveValue('river-13');
          await expect(page.getByTestId('river-river-13')).toHaveAttribute('data-hexes', 'c12r12,c13r12');
          await expect(page.getByTestId('river-fields')).toHaveAttribute('data-river', 'river-13');
          await expect(page.getByTestId('river-drainage')).toHaveValue('9');
          await expect(page.getByTestId('drainage-river-13')).toHaveText('9'); // drawn at the mouth as the game draws it
          await expect(page.getByTestId('change-river-river-13')).toContainText('River 13: added, 2 hexes');
          await expect(page.getByTestId('editor-changes')).toHaveAttribute('data-count', '4');
        } }
      ],
      status: 'edited'
    });

    // The single hex editor (prompt 49): c13r12, the new river's inland end, is the hex chosen; its spokes are edited.
    await expect(page.getByTestId('hex-editor')).toHaveAttribute('data-hex', 'c13r12');
    await page.getByTestId('spoke-2').click();

    await steps.step('spoke-added', {
      description: 'The hex editor shows c13r12 with six spokes, the one to the west blue where River 13 comes in; a tap on the east spoke leads the river on to c14r12: the spoke turns blue and the course on the map grows at once',
      verifications: [
        { spec: 'The hex editor shows spokes 2 and 5 as river, both River 13\'s; the course on the map runs c12r12, c13r12, c14r12 and the change says three hexes', check: async () => {
          await expect(page.getByTestId('hex-editor')).toHaveAttribute('data-spokes', '2,5');
          await expect(page.getByTestId('spoke-2')).toHaveAttribute('aria-pressed', 'true');
          await expect(page.getByTestId('spoke-2')).toHaveAttribute('data-river', 'river-13');
          await expect(page.getByTestId('spoke-5')).toHaveAttribute('aria-pressed', 'true');
          await expect(page.getByTestId('spoke-1')).toHaveAttribute('aria-pressed', 'false');
          await expect(page.getByTestId('river-river-13')).toHaveAttribute('data-hexes', 'c12r12,c13r12,c14r12');
          await expect(page.getByTestId('change-river-river-13')).toContainText('River 13: added, 3 hexes');
        } }
      ],
      status: 'edited'
    });

    await page.getByTestId('spoke-2').click();

    await steps.step('spoke-cleared', {
      description: 'The same spoke tapped again clears it: c14r12 comes off the river\'s end, the spoke is empty and the course on the map is two hexes again',
      verifications: [
        { spec: 'Only spoke 5 is river; the course is c12r12, c13r12; a spoke toward the middle of a course is refused with the reason', check: async () => {
          await expect(page.getByTestId('hex-editor')).toHaveAttribute('data-spokes', '5');
          await expect(page.getByTestId('spoke-2')).toHaveAttribute('aria-pressed', 'false');
          await expect(page.getByTestId('river-river-13')).toHaveAttribute('data-hexes', 'c12r12,c13r12');
          await expect(page.getByTestId('change-river-river-13')).toContainText('River 13: added, 2 hexes');
          // The Niger's second hex: its spoke on to the junction cannot be cleared, the river running on through both.
          await page.getByTestId('tool-river').click(); // the course tool put down, a tap on the map only chooses the hex
          await expect(page.getByTestId('tool-river')).toHaveAttribute('aria-pressed', 'false');
          await page.getByTestId('edit-hex-c2r7').click();
          await expect(page.getByTestId('hex-editor')).toHaveAttribute('data-spokes', '4,6');
          await page.getByTestId('spoke-6').click();
          await expect(page.getByTestId('editor-status')).toHaveText('the Niger runs on through c2r7 and c2r6: take its hexes off from an end');
          await expect(page.getByTestId('river-niger')).toHaveAttribute('data-hexes', 'c2r8,c2r7,c2r6,c2r5');
          await page.getByTestId('edit-hex-c13r12').click();
        } }
      ],
      status: 'edited'
    });

    // A river from the coast (prompt 51): c23r19, veldt by Kilwa, has the sea to its east; the seaward spoke starts a river flowing out there.
    await page.getByTestId('edit-hex-c23r19').click();
    await expect(page.getByTestId('hex-editor')).toHaveAttribute('data-spokes', '');
    await page.getByTestId('spoke-2').click();

    await steps.step('mouth-to-the-sea', {
      description: 'On a coastal hex with no river, a tap on the spoke toward the sea starts a river whose mouth is this hex, flowing out to the east: the spoke is blue, and on the map the new river reaches from the hex into the sea',
      verifications: [
        { spec: 'River 14 has the one hex c23r19 and its mouth to the east (2); the sea spoke is blue; the change says added, 1 hex', check: async () => {
          await expect(page.getByTestId('hex-editor')).toHaveAttribute('data-spokes', '2');
          await expect(page.getByTestId('spoke-2')).toHaveAttribute('data-sea', 'true');
          await expect(page.getByTestId('spoke-2')).toHaveAttribute('data-river', 'river-14');
          await expect(page.getByTestId('river-river-14')).toHaveAttribute('data-hexes', 'c23r19');
          await expect(page.getByTestId('river-river-14')).toHaveAttribute('data-mouth', '2');
          await expect(page.getByTestId('change-river-river-14')).toContainText('River 14: added, 1 hex');
          await expect(page.getByTestId('editor-changes')).toHaveAttribute('data-count', '5');
          await expect(page.getByTestId('selected-hex')).toContainText('River 14');
        } }
      ],
      status: 'edited'
    });

    await page.getByTestId('save-board').click();
    await expect(page.getByTestId('editor-status')).toHaveAttribute('data-status', 'synced');

    await steps.step('saved', {
      description: 'Save sends the board to the capture server as a save command and the answer is read: the change list empties, the jungle hex and the rivers stay as the board now is, and the message says the file was written',
      verifications: [
        { spec: 'The server received one save command for the board with the five changes, the hexes as painted and the rivers as drawn', check: async () => {
          expect(saves).toHaveLength(1);
          const cmd = saves[0] as { type: string; target: string; changes: unknown[]; data: { hexes: Record<string, { terrain: string | null }>; rivers: { id: string; name: string; path: string[]; cataracts: string[]; drainage?: number; mouth?: number }[] } };
          expect(cmd.type).toBe('save');
          expect(cmd.target).toBe('board');
          expect(cmd.changes).toEqual([
            { kind: 'hex', id: 'c7r19', from: 'veldt', to: 'mountain' },
            { kind: 'hex', id: 'c8r20', from: 'veldt', to: 'jungle' },
            { kind: 'river', id: 'benue', name: 'Benue River', summary: 'named Benue River; +c4r6; cataract at c3r6' },
            { kind: 'river', id: 'river-13', name: 'River 13', summary: 'added, 2 hexes' },
            { kind: 'river', id: 'river-14', name: 'River 14', summary: 'added, 1 hex' }
          ]);
          expect(cmd.data.hexes['c8r20']).toEqual({ col: 8, row: 20, terrain: 'jungle' });
          expect(cmd.data.hexes['c7r19']).toEqual({ col: 7, row: 19, terrain: 'mountain', port: 'luanda' });
          expect(Object.keys(cmd.data.hexes)).toHaveLength(625);
          expect(cmd.data.rivers.find((r) => r.id === 'benue')).toEqual({ id: 'benue', name: 'Benue River', joins: 'niger', path: ['c2r6', 'c3r6', 'c4r6'], cataracts: ['c3r6'] });
          expect(cmd.data.rivers.find((r) => r.id === 'river-13')).toEqual({ id: 'river-13', name: 'River 13', drainage: 9, path: ['c12r12', 'c13r12'], cataracts: [] });
          expect(cmd.data.rivers.at(-1)).toEqual({ id: 'river-14', name: 'River 14', mouth: 2, path: ['c23r19'], cataracts: [] });
        } },
        { spec: 'Nothing is left to save: the list is empty, Save is disabled, c8r20 stays jungle without the changed outline, the rivers stay, and the message names the file', check: async () => {
          await expect(page.getByTestId('editor-changes')).toHaveAttribute('data-count', '0');
          await expect(page.getByTestId('save-board')).toBeDisabled();
          await expect(page.getByTestId('edit-hex-c8r20')).toHaveAttribute('data-terrain', 'jungle');
          await expect(page.getByTestId('changed-c8r20')).toHaveCount(0);
          await expect(page.getByTestId('river-benue')).toHaveAttribute('data-hexes', 'c2r6,c3r6,c4r6');
          await expect(page.getByTestId('editor-status')).toHaveText('Saved 5 changes to src/lib/features/map/board.json; the table\'s dev server offers the reload');
        } }
      ]
    });

    steps.generateDocs();
  });
});
