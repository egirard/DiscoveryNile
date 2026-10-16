import { test, expect } from '@playwright/test';
import { TestStepHelper } from '../helpers/test-step-helper';

const SERVER = 'http://127.0.0.1:3002';

test.describe('040 - Map editor', () => {
  test('a hex misread from the photograph is repainted in the editor and the board is saved to the capture server', async ({ page }, testInfo) => {
    const steps = new TestStepHelper(page, testInfo);
    steps.setMetadata(
      'Map editor',
      'The board was transcribed from a photograph of the 1978 map and some hexes were misread (RQ-5). The map editor at /editor/ is a tool of its own, apart from the table: every hex of the grid drawn north up, sea and land, a brush of eight terrains, blank and sea, the rivers listed with a course tool that adds a hex at either end with a tap, a cataract tool and the river\'s fields, a single hex editor showing the hex tapped with six spokes, blue where a river leaves it, each a tap to add or clear that river edge, the changes listed with a take-back each, and Save sending the whole board to the diagnostics capture server as a save command, which writes board.json in the source tree for the dev server to pick up. A port and a river hex stay land whatever the brush.'
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
      description: 'The editor shows the whole 27×42 grid north up, sea and land, with the pre-printed terrain, the rivers and the ports; the counts read 626 land hexes and 447 blank, the brushes wait, the capture server is named, and there is nothing to save',
      verifications: [
        { spec: 'Every hex of the grid is drawn; 626 are land and 447 blank (RQ-5); Luanda stands on a veldt hex', check: async () => {
          await expect(page.locator('[data-testid^="edit-hex-"]')).toHaveCount(27 * 42);
          await expect(page.locator('[data-testid^="edit-hex-"][data-kind="land"]')).toHaveCount(626);
          await expect(page.getByTestId('editor-counts')).toHaveAttribute('data-land', '626');
          await expect(page.getByTestId('editor-counts')).toHaveAttribute('data-blank', '447');
          await expect(page.getByTestId('edit-hex-c7r19')).toHaveAttribute('data-terrain', 'veldt');
          await expect(page.getByTestId('edit-hex-c7r19')).toHaveAttribute('data-port', 'luanda');
          await expect(page.getByTestId('edit-hex-c1r19')).toHaveAttribute('data-kind', 'sea');
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
        } },
        { spec: 'The change is listed as veldt → jungle with a take-back, the counts hold, and Save is enabled', check: async () => {
          await expect(page.getByTestId('editor-changes')).toHaveAttribute('data-count', '1');
          await expect(page.getByTestId('change-c8r20')).toContainText('c8r20: veldt → jungle');
          await expect(page.getByTestId('undo-c8r20')).toBeVisible();
          await expect(page.getByTestId('editor-counts')).toHaveAttribute('data-land', '626');
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
          await expect(page.getByTestId('river-course-benue')).toHaveAttribute('data-hexes', 'c2r6,c3r6,c4r6');
          await expect(page.getByTestId('river-candidate-c5r6')).toBeVisible();
          await expect(page.getByTestId('river-candidate-c4r6')).toHaveCount(0);
          await expect(page.getByTestId('river-fields')).toHaveAttribute('data-river', 'benue');
          await expect(page.getByTestId('river-joins')).toHaveValue('niger');
        } },
        { spec: 'The change list holds the hex and the river: renamed and one hex longer', check: async () => {
          await expect(page.getByTestId('editor-changes')).toHaveAttribute('data-count', '2');
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
          await expect(page.getByTestId('cataract-c3r6')).toBeVisible();
          await expect(page.getByTestId('change-river-benue')).toContainText('cataract at c3r6');
          await expect(page.getByTestId('editor-changes')).toHaveAttribute('data-count', '2');
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
        { spec: 'The thirteenth river runs c12r12, c13r12 with drainage 9, drawn with its number at the mouth; the list has thirteen rivers and the changes three', check: async () => {
          await expect(page.getByTestId('river-select')).toHaveAttribute('data-count', '13');
          await expect(page.getByTestId('river-select')).toHaveValue('river-13');
          await expect(page.getByTestId('river-course-river-13')).toHaveAttribute('data-hexes', 'c12r12,c13r12');
          await expect(page.getByTestId('river-fields')).toHaveAttribute('data-river', 'river-13');
          await expect(page.getByTestId('river-drainage')).toHaveValue('9');
          await expect(page.getByTestId('change-river-river-13')).toContainText('River 13: added, 2 hexes');
          await expect(page.getByTestId('editor-changes')).toHaveAttribute('data-count', '3');
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
          await expect(page.getByTestId('river-course-river-13')).toHaveAttribute('data-hexes', 'c12r12,c13r12,c14r12');
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
          await expect(page.getByTestId('river-course-river-13')).toHaveAttribute('data-hexes', 'c12r12,c13r12');
          await expect(page.getByTestId('change-river-river-13')).toContainText('River 13: added, 2 hexes');
          // The Niger's second hex: its spoke on to the junction cannot be cleared, the river running on through both.
          await page.getByTestId('tool-river').click(); // the course tool put down, a tap on the map only chooses the hex
          await expect(page.getByTestId('tool-river')).toHaveAttribute('aria-pressed', 'false');
          await page.getByTestId('edit-hex-c2r7').click();
          await expect(page.getByTestId('hex-editor')).toHaveAttribute('data-spokes', '4,6');
          await page.getByTestId('spoke-6').click();
          await expect(page.getByTestId('editor-status')).toHaveText('the Niger runs on through c2r7 and c2r6: take its hexes off from an end');
          await expect(page.getByTestId('river-course-niger')).toHaveAttribute('data-hexes', 'c2r8,c2r7,c2r6,c2r5');
          await page.getByTestId('edit-hex-c13r12').click();
        } }
      ],
      status: 'edited'
    });

    await page.getByTestId('save-board').click();
    await expect(page.getByTestId('editor-status')).toHaveAttribute('data-status', 'synced');

    await steps.step('saved', {
      description: 'Save sends the board to the capture server as a save command and the answer is read: the change list empties, the jungle hex and the rivers stay as the board now is, and the message says the file was written',
      verifications: [
        { spec: 'The server received one save command for the board with the three changes, the hex as painted and the rivers as drawn', check: async () => {
          expect(saves).toHaveLength(1);
          const cmd = saves[0] as { type: string; target: string; changes: unknown[]; data: { hexes: Record<string, { terrain: string | null }>; rivers: { id: string; name: string; path: string[]; cataracts: string[]; drainage?: number }[] } };
          expect(cmd.type).toBe('save');
          expect(cmd.target).toBe('board');
          expect(cmd.changes).toEqual([
            { kind: 'hex', id: 'c8r20', from: 'veldt', to: 'jungle' },
            { kind: 'river', id: 'benue', name: 'Benue River', summary: 'named Benue River; +c4r6; cataract at c3r6' },
            { kind: 'river', id: 'river-13', name: 'River 13', summary: 'added, 2 hexes' }
          ]);
          expect(cmd.data.hexes['c8r20']).toEqual({ col: 8, row: 20, terrain: 'jungle' });
          expect(cmd.data.hexes['c7r19']).toMatchObject({ terrain: 'veldt', port: 'luanda' });
          expect(Object.keys(cmd.data.hexes)).toHaveLength(626);
          expect(cmd.data.rivers.find((r) => r.id === 'benue')).toEqual({ id: 'benue', name: 'Benue River', joins: 'niger', path: ['c2r6', 'c3r6', 'c4r6'], cataracts: ['c3r6'] });
          expect(cmd.data.rivers.at(-1)).toEqual({ id: 'river-13', name: 'River 13', drainage: 9, path: ['c12r12', 'c13r12'], cataracts: [] });
        } },
        { spec: 'Nothing is left to save: the list is empty, Save is disabled, c8r20 stays jungle without the changed outline, the rivers stay, and the message names the file', check: async () => {
          await expect(page.getByTestId('editor-changes')).toHaveAttribute('data-count', '0');
          await expect(page.getByTestId('save-board')).toBeDisabled();
          await expect(page.getByTestId('edit-hex-c8r20')).toHaveAttribute('data-terrain', 'jungle');
          await expect(page.getByTestId('changed-c8r20')).toHaveCount(0);
          await expect(page.getByTestId('river-course-benue')).toHaveAttribute('data-hexes', 'c2r6,c3r6,c4r6');
          await expect(page.getByTestId('editor-status')).toHaveText('Saved 3 changes to src/lib/features/map/board.json; the table\'s dev server offers the reload');
        } }
      ]
    });

    steps.generateDocs();
  });
});
