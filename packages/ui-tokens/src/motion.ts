export const motion = {
  durationFast: 150,
  durationBase: 200,
  durationSlow: 250,
  easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
  spring: { damping: 18, stiffness: 180, mass: 1 },
} as const;

export const iconSizes = { sm: 16, md: 20, lg: 24, xl: 32 } as const;
export const iconStrokeWidth = 1.75;
