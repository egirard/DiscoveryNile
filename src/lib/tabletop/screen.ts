// Physical screen size is local configuration: the diagonal in inches, persisted per browser.
const KEY = 'tabletop:screen:diagonal-inches:v1';
export const DEFAULT_DIAGONAL_INCHES = 55;

export function readDiagonalInches(search = typeof location === 'undefined' ? '' : location.search): number {
  const fromQuery = Number(new URLSearchParams(search).get('diag'));
  if (Number.isFinite(fromQuery) && fromQuery > 0) {
    try {
      localStorage.setItem(KEY, String(fromQuery));
    } catch {
      /* private mode */
    }
    return fromQuery;
  }
  try {
    const stored = Number(localStorage.getItem(KEY));
    if (Number.isFinite(stored) && stored > 0) return stored;
  } catch {
    /* private mode */
  }
  return DEFAULT_DIAGONAL_INCHES;
}

/** Millimetres per CSS pixel for a screen of the given diagonal and CSS viewport. */
export function mmPerPx(diagonalInches: number, widthPx: number, heightPx: number): number {
  const diagonalPx = Math.hypot(widthPx, heightPx);
  return (diagonalInches * 25.4) / diagonalPx;
}

/** Pixels needed for a physical size (rounded up, so the size is never under it), never below a floor in CSS px. */
export function pxFor(mm: number, mmPerPixel: number, floorPx = 44): number {
  return Math.max(floorPx, Math.ceil(mm / mmPerPixel));
}

export interface ScreenGeometry {
  diagonalInches: number;
  widthPx: number;
  heightPx: number;
  widthMm: number;
  heightMm: number;
}

export function screenGeometry(diagonalInches: number, widthPx: number, heightPx: number): ScreenGeometry {
  const k = mmPerPx(diagonalInches, widthPx, heightPx);
  return { diagonalInches, widthPx, heightPx, widthMm: widthPx * k, heightMm: heightPx * k };
}
