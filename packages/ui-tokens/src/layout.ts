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

export const radius = { card: 22, button: 16, chip: 9999, sheet: 28, input: 14, image: 16 } as const;

export const shadows = {
  low: { color: 'rgba(54,32,16,0.07)', x: 0, y: 2, blur: 8 },
  mid: { color: 'rgba(54,32,16,0.14)', x: 0, y: 12, blur: 28 },
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
