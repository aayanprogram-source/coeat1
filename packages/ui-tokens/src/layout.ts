export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
} as const;

export const radius = { card: 16, button: 12, chip: 9999, sheet: 24, input: 12, image: 12 } as const;

export const shadows = {
  low: { color: 'rgba(15,61,62,0.06)', x: 0, y: 1, blur: 2 },
  mid: { color: 'rgba(15,61,62,0.10)', x: 0, y: 6, blur: 16 },
} as const;

export const shadowCss = {
  low: `0 1px 2px ${shadows.low.color}`,
  mid: `0 6px 16px ${shadows.mid.color}`,
} as const;

export const hairline = 1;
export const pageMarginMobile = 16;
export const minTouchTarget = 44;
export const dashboardColumns = 12;
export const dashboardNavWidth = 248;
