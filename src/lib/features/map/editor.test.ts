import { describe, expect, it } from 'vitest';
import { directionTo } from './hex';
import board from './board.json';
import raw from './board.json?raw';
import { addRiver, brushAt, changesBetween, counts, normaliseRiver, paint, removeRiver, riverCandidates, riverSpokes, riverTap, serialiseBoard, toggleCataract, toggleRiverSpoke, updateRiver, validateBoard, type RawBoard } from './editor';

const BOARD = board as RawBoard;

describe('the map editor (prompt 47)', () => {
  it('writes board.json back exactly as the transcription wrote it', () => {
    expect(serialiseBoard(BOARD)).toBe(raw);
    expect(validateBoard(BOARD)).toBeNull();
    expect(counts(BOARD)).toEqual({ land: 626, blank: 447 }); // RQ-5
  });
  it('paints a terrain, a blank or the sea onto a hex and lists the change', () => {
    const jungle = paint(BOARD, 'c8r20', 'jungle') as RawBoard;
    expect(brushAt(jungle, 'c8r20')).toBe('jungle');
    expect(jungle.hexes['c8r20']).toEqual({ col: 8, row: 20, terrain: 'jungle' });
    expect(changesBetween(BOARD, jungle)).toEqual([{ kind: 'hex', id: 'c8r20', from: 'veldt', to: 'jungle' }]);
    const blank = paint(jungle, 'c8r20', 'blank') as RawBoard;
    expect(blank.hexes['c8r20'].terrain).toBeNull();
    expect(changesBetween(BOARD, blank)).toEqual([{ kind: 'hex', id: 'c8r20', from: 'veldt', to: 'blank' }]);
    const sea = paint(BOARD, 'c8r21', 'sea') as RawBoard;
    expect(sea.hexes['c8r21']).toBeUndefined();
    expect(brushAt(sea, 'c8r21')).toBe('sea');
    expect(changesBetween(BOARD, sea)).toEqual([{ kind: 'hex', id: 'c8r21', from: 'jungle', to: 'sea' }]);
    expect(changesBetween(sea, BOARD)).toEqual([{ kind: 'hex', id: 'c8r21', from: 'sea', to: 'jungle' }]);
    // The same brush again changes nothing.
    expect(paint(BOARD, 'c8r20', 'veldt')).toBe(BOARD);
  });
  it('keeps a port and a river hex on land', () => {
    expect(paint(BOARD, 'c7r19', 'sea')).toBe('c7r19 is the port of Luanda: it stays land');
    expect(paint(BOARD, 'c2r7', 'sea')).toBe('c2r7 carries the Niger: it stays land');
    expect(paint(BOARD, 'c99r1', 'veldt')).toBe('c99r1 is off the board');
    // A port's terrain can change; the port stays.
    const mountain = paint(BOARD, 'c7r19', 'mountain') as RawBoard;
    expect(mountain.hexes['c7r19']).toEqual({ col: 7, row: 19, terrain: 'mountain', port: 'luanda' });
    expect(validateBoard(mountain)).toBeNull();
  });
  it('makes a sea hex land in the file\'s row-major order', () => {
    const land = paint(BOARD, 'c1r20', 'blank') as RawBoard;
    const keys = Object.keys(land.hexes);
    const i = keys.indexOf('c1r20');
    expect(land.hexes['c1r20']).toEqual({ col: 1, row: 20, terrain: null });
    expect(keys[i + 1]).toBe('c8r20'); // before the first hex of row 20 as it was
    expect(land.hexes[keys[i - 1]].row).toBe(19);
    expect(validateBoard(land)).toBeNull();
    expect(counts(land)).toEqual({ land: 627, blank: 448 });
  });
  it('refuses a board the file cannot hold', () => {
    expect(validateBoard(null)).toBe('the board is not an object');
    expect(validateBoard({ ...BOARD, hexes: { ...BOARD.hexes, c8r20: { col: 8, row: 20, terrain: 'marsh' } } })).toBe('c8r20 has an unknown terrain marsh');
    expect(validateBoard({ ...BOARD, hexes: { ...BOARD.hexes, c8r20: { col: 9, row: 20, terrain: 'veldt' } } })).toBe('c8r20 is keyed at c9r20');
    const { c7r19: _luanda, ...withoutLuanda } = BOARD.hexes;
    expect(validateBoard({ ...BOARD, hexes: withoutLuanda })).toBe('port luanda is not on its hex c7r19');
    const { c2r7: _niger, ...withoutNiger } = BOARD.hexes;
    expect(validateBoard({ ...BOARD, hexes: withoutNiger })).toBe('the Niger runs through c2r7, which is not land');
    expect(validateBoard({ ...BOARD, hexes: { ...BOARD.hexes, c30r50: { col: 30, row: 50, terrain: null } } })).toBe('c30r50 is off the 27×42 board');
  });
});

describe('rivers in the map editor (prompt 48)', () => {
  const river = (b: RawBoard, id: string) => b.rivers.find((r) => r.id === id)!;
  it('extends a river from either end, takes hexes off its ends, and keeps the file\'s field order', () => {
    // The Benue ends at the blank c3r6; c4r6 lies beside it.
    const longer = riverTap(BOARD, 'benue', 'c4r6') as RawBoard;
    expect(river(longer, 'benue').path).toEqual(['c2r6', 'c3r6', 'c4r6']);
    expect(Object.keys(river(longer, 'benue'))).toEqual(['id', 'name', 'joins', 'path', 'cataracts']);
    expect(changesBetween(BOARD, longer)).toEqual([{ kind: 'river', id: 'benue', name: 'Benue', summary: '+c4r6' }]);
    expect(validateBoard(longer)).toBeNull();
    expect(riverCandidates(longer, 'benue').sort()).toEqual(['c2r5', 'c2r7', 'c3r5', 'c3r7', 'c4r5', 'c4r7', 'c5r6'].sort());
    // Tapping the inland end takes it off again; a middle hex is refused; a hex apart is refused; sea is refused.
    expect(river(riverTap(longer, 'benue', 'c4r6') as RawBoard, 'benue').path).toEqual(['c2r6', 'c3r6']);
    expect(riverTap(longer, 'benue', 'c3r6')).toBe('c3r6 is in the middle of the Benue: take the hexes off from an end');
    expect(riverTap(BOARD, 'benue', 'c10r10')).toBe('c10r10 is not next to either end of the Benue (c2r6 to c3r6)');
    expect(riverTap(BOARD, 'benue', 'c1r6')).toBe('c1r6 is sea: a river runs on land');
    // A hex beside the mouth becomes the new mouth.
    const mouth = riverTap(BOARD, 'niger', 'c3r8') as RawBoard;
    expect(river(mouth, 'niger').path.slice(0, 2)).toEqual(['c3r8', 'c2r8']);
    expect(changesBetween(BOARD, mouth)[0]).toMatchObject({ kind: 'river', summary: '+c3r8' });
  });
  it('marks and unmarks a cataract on a river hex, in the path\'s order', () => {
    const marked = toggleCataract(BOARD, 'c3r6') as RawBoard;
    expect(river(marked, 'benue').cataracts).toEqual(['c3r6']);
    expect(changesBetween(BOARD, marked)).toEqual([{ kind: 'river', id: 'benue', name: 'Benue', summary: 'cataract at c3r6' }]);
    expect(river(toggleCataract(marked, 'c3r6') as RawBoard, 'benue').cataracts).toEqual([]);
    expect(toggleCataract(BOARD, 'c10r10')).toBe('no river runs through c10r10');
    expect(toggleCataract(BOARD, 'c3r6', 'niger')).toBe('c3r6 is not on the Niger');
    const twice = toggleCataract(toggleCataract(BOARD, 'c20r4') as RawBoard, 'c20r2') as RawBoard;
    expect(river(twice, 'white-nile').cataracts).toEqual(['c20r2', 'c20r4']);
    expect(validateBoard(twice)).toBeNull();
  });
  it('adds, names and removes rivers, a river another joins staying', () => {
    const { board: added, id } = addRiver(BOARD);
    expect(id).toBe('river-13');
    expect(river(added, id)).toEqual({ id, name: 'River 13', path: [], cataracts: [] });
    expect(validateBoard(added)).toBe('the River 13 has no hexes');
    const placed = riverTap(added, id, 'c12r12') as RawBoard;
    expect(river(placed, id).path).toEqual(['c12r12']);
    expect(changesBetween(BOARD, placed)).toEqual([{ kind: 'river', id, name: 'River 13', summary: 'added, 1 hex' }]);
    const named = updateRiver(placed, id, { name: 'Lualaba', drainage: 12, continuesOffMap: true }) as RawBoard;
    expect(river(named, id)).toEqual({ id, name: 'Lualaba', drainage: 12, continuesOffMap: true, path: ['c12r12'], cataracts: [] });
    expect(validateBoard(named)).toBeNull();
    const plain = updateRiver(named, id, { drainage: undefined, continuesOffMap: false }) as RawBoard;
    expect(Object.keys(river(plain, id))).toEqual(['id', 'name', 'path', 'cataracts']);
    expect(updateRiver(named, id, { name: ' ' })).toBe('a river needs a name');
    expect(updateRiver(named, id, { joins: 'nowhere' })).toBe('no river nowhere to join');
    expect(changesBetween(BOARD, updateRiver(BOARD, 'rufiji', { name: 'Rufiji River', drainage: 11 }) as RawBoard)).toEqual([{ kind: 'river', id: 'rufiji', name: 'Rufiji River', summary: 'named Rufiji River; drainage 11' }]);
    expect(removeRiver(BOARD, 'niger')).toBe('the Benue joins the Niger: it stays');
    const gone = removeRiver(BOARD, 'benue') as RawBoard;
    expect(gone.rivers.map((r) => r.id)).not.toContain('benue');
    expect(changesBetween(BOARD, gone)).toEqual([{ kind: 'river', id: 'benue', name: 'Benue', summary: 'removed' }]);
    expect(validateBoard(gone)).toBeNull();
    expect(normaliseRiver({ id: 'x', name: 'X', path: [], cataracts: [], continuesOffMap: false, drainage: undefined })).toEqual({ id: 'x', name: 'X', path: [], cataracts: [] });
  });
  it('refuses a river the file cannot hold', () => {
    const withRiver = (r: Partial<RawBoard['rivers'][0]>) => ({ ...BOARD, rivers: [...BOARD.rivers, { id: 'r', name: 'R', path: ['c12r12'], cataracts: [], ...r }] });
    expect(validateBoard(withRiver({ path: ['c12r12', 'c14r12'] }))).toBe('the R jumps from c12r12 to c14r12');
    expect(validateBoard(withRiver({ path: ['c12r12', 'c13r12', 'c12r12'] }))).toBe('the R runs through a hex twice');
    expect(validateBoard(withRiver({ cataracts: ['c13r12'] }))).toBe('the R has a cataract at c13r12, off its course');
    expect(validateBoard(withRiver({ joins: 'niger' }))).toBe('the R joins the Niger at c12r12, which is not on it');
    expect(validateBoard(withRiver({ joins: 'r' }))).toBe('the R joins r, which is no river');
    expect(validateBoard(withRiver({ drainage: 0 }))).toBe('the R has a bad drainage number');
    expect(validateBoard(withRiver({ id: 'niger' }))).toBe('two rivers are called niger');
  });
});

describe('the single hex editor (prompt 49)', () => {
  const river = (b: RawBoard, id: string) => b.rivers.find((r) => r.id === id)!;
  const spokes = (b: RawBoard, hex: Parameters<typeof riverSpokes>[1]) => riverSpokes(b, hex).map((s) => `${s.direction}:${s.river.id}`);
  it('reads the directions the rivers leave a hex in from their courses', () => {
    expect(spokes(BOARD, 'c2r6')).toEqual(['1:niger', '2:benue', '3:niger']); // the Niger's junction with the Benue
    expect(spokes(BOARD, 'c3r6')).toEqual(['5:benue']); // the Benue's inland end
    expect(spokes(BOARD, 'c12r12')).toEqual([]);
    expect(spokes(BOARD, 'c20r1').sort()).toEqual([`${directionTo('c20r1', 'c20r2')}:white-nile`, `${directionTo('c20r1', 'c21r2')}:blue-nile`].sort()); // Khartoum: both Niles leave
  });
  it('adds a spoke by extending the river that ends here, and clears one by taking the end hex off', () => {
    const longer = toggleRiverSpoke(BOARD, 'c3r6', 2) as RawBoard; // east of the Benue's end: c4r6
    expect(river(longer, 'benue').path).toEqual(['c2r6', 'c3r6', 'c4r6']);
    expect(spokes(longer, 'c3r6')).toEqual(['2:benue', '5:benue']);
    const back = toggleRiverSpoke(longer, 'c3r6', 2) as RawBoard; // the same spoke again: c4r6 comes off
    expect(river(back, 'benue').path).toEqual(['c2r6', 'c3r6']);
    // From the new end's side: clearing the spoke back toward the river takes the end hex itself off.
    expect(river(toggleRiverSpoke(longer, 'c4r6', 5) as RawBoard, 'benue').path).toEqual(['c2r6', 'c3r6']);
    // A spoke toward a hex at the other river's end extends that river to here.
    expect(river(toggleRiverSpoke(BOARD, 'c4r6', 5) as RawBoard, 'benue').path).toEqual(['c2r6', 'c3r6', 'c4r6']);
  });
  it('refuses to cut a course in the middle or to orphan a tributary, and keeps rivers on land', () => {
    expect(toggleRiverSpoke(BOARD, 'c2r6', directionTo('c2r6', 'c2r7')!)).toBe('the Niger runs on through c2r6 and c2r7: take its hexes off from an end');
    // The Blue Nile joins the White Nile at Khartoum (c20r1), the White Nile's mouth: that end cannot come off.
    expect(toggleRiverSpoke(BOARD, 'c20r1', directionTo('c20r1', 'c20r2')!)).toBe('the Blue Nile joins the White Nile at c20r1: move the junction first');
    // A spoke toward a blank land hex beside the Benue's end extends it; one toward the sea is refused.
    expect(river(toggleRiverSpoke(BOARD, 'c3r6', directionTo('c3r6', 'c3r5')!) as RawBoard, 'benue').path).toEqual(['c2r6', 'c3r6', 'c3r5']);
    expect(toggleRiverSpoke(BOARD, 'c2r8', directionTo('c2r8', 'c1r8')!)).toBe('c1r8 is sea: a river runs on land');
  });
  it('starts a tributary from a hex in the middle of a course, and a new river from a hex without one', () => {
    const tributary = toggleRiverSpoke(BOARD, 'c2r7', 2) as RawBoard; // east of the Niger's second hex: c3r7, jungle
    const t = tributary.rivers.at(-1)!;
    expect(t).toEqual({ id: 'river-13', name: 'River 13', joins: 'niger', path: ['c2r7', 'c3r7'], cataracts: [] });
    expect(validateBoard(tributary)).toBeNull();
    expect(spokes(tributary, 'c2r7')).toEqual(['2:river-13', '4:niger', '6:niger']);
    const fresh = toggleRiverSpoke(BOARD, 'c12r12', 2) as RawBoard;
    expect(fresh.rivers.at(-1)).toEqual({ id: 'river-13', name: 'River 13', path: ['c12r12', 'c13r12'], cataracts: [] });
    expect(changesBetween(BOARD, fresh)).toEqual([{ kind: 'river', id: 'river-13', name: 'River 13', summary: 'added, 2 hexes' }]);
    // Two rivers that do not meet: the Niger's junction hex toward the Ogooue? Both carry rivers already.
    const twoRivers = toggleRiverSpoke(toggleRiverSpoke(BOARD, 'c12r12', 2) as RawBoard, 'c12r14', 6) as RawBoard; // a second new river below
    expect(twoRivers.rivers).toHaveLength(14);
  });
});
