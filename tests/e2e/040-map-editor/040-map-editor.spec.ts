import { test, expect } from '@playwright/test';
import { TestStepHelper } from '../helpers/test-step-helper';

const SERVER = 'http://127.0.0.1:3002';

test.describe('040 - Map editor', () => {
  test('a hex misread from the photograph is repainted in the editor and the board is saved to the capture server', async ({ page }, testInfo) => {
    const steps = new TestStepHelper(page, testInfo);
    steps.setMetadata(
      'Map editor',
      'The board was transcribed from a photograph of the 1978 map and some hexes were misread (RQ-5). The map editor at /editor/ is a tool of its own, apart from the table: every hex of the grid drawn north up, sea and land, a brush of eight terrains, blank and sea, the changes listed with a take-back each, and Save sending the whole board to the diagnostics capture server as a save command, which writes board.json in the source tree for the dev server to pick up. A port and a river hex stay land whatever the brush.'
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

    await page.getByTestId('save-board').click();
    await expect(page.getByTestId('editor-status')).toHaveAttribute('data-status', 'synced');

    await steps.step('saved', {
      description: 'Save sends the board to the capture server as a save command and the answer is read: the change list empties, the jungle hex stays as the board now is, and the message says the file was written',
      verifications: [
        { spec: 'The server received one save command for the board with the one change and the hex as painted', check: async () => {
          expect(saves).toHaveLength(1);
          const cmd = saves[0] as { type: string; target: string; changes: unknown[]; data: { hexes: Record<string, { terrain: string | null }> } };
          expect(cmd.type).toBe('save');
          expect(cmd.target).toBe('board');
          expect(cmd.changes).toEqual([{ id: 'c8r20', from: 'veldt', to: 'jungle' }]);
          expect(cmd.data.hexes['c8r20']).toEqual({ col: 8, row: 20, terrain: 'jungle' });
          expect(cmd.data.hexes['c7r19']).toMatchObject({ terrain: 'veldt', port: 'luanda' });
          expect(Object.keys(cmd.data.hexes)).toHaveLength(626);
        } },
        { spec: 'Nothing is left to save: the list is empty, Save is disabled, c8r20 stays jungle without the changed outline, and the message names the file', check: async () => {
          await expect(page.getByTestId('editor-changes')).toHaveAttribute('data-count', '0');
          await expect(page.getByTestId('save-board')).toBeDisabled();
          await expect(page.getByTestId('edit-hex-c8r20')).toHaveAttribute('data-terrain', 'jungle');
          await expect(page.getByTestId('changed-c8r20')).toHaveCount(0);
          await expect(page.getByTestId('editor-status')).toHaveText('Saved 1 hex change to src/lib/features/map/board.json; the table\'s dev server offers the reload');
        } }
      ]
    });

    steps.generateDocs();
  });
});
