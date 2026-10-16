import { describe, expect, it } from 'vitest';
import board from './board.json';
import raw from './board.json?raw';
import { brushAt, changesBetween, counts, paint, serialiseBoard, validateBoard, type RawBoard } from './editor';

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
    expect(changesBetween(BOARD, jungle)).toEqual([{ id: 'c8r20', from: 'veldt', to: 'jungle' }]);
    const blank = paint(jungle, 'c8r20', 'blank') as RawBoard;
    expect(blank.hexes['c8r20'].terrain).toBeNull();
    expect(changesBetween(BOARD, blank)).toEqual([{ id: 'c8r20', from: 'veldt', to: 'blank' }]);
    const sea = paint(BOARD, 'c8r21', 'sea') as RawBoard;
    expect(sea.hexes['c8r21']).toBeUndefined();
    expect(brushAt(sea, 'c8r21')).toBe('sea');
    expect(changesBetween(BOARD, sea)).toEqual([{ id: 'c8r21', from: 'jungle', to: 'sea' }]);
    expect(changesBetween(sea, BOARD)).toEqual([{ id: 'c8r21', from: 'sea', to: 'jungle' }]);
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
