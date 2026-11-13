export const fontFamilies = {
  heading: 'Fraunces',
  body: 'Inter',
} as const;

export const fontWeights = { heading: '600', regular: '400', medium: '500', semibold: '600' } as const;

export const typeScale = {
  display: { fontSize: 32, lineHeight: 38, family: 'heading', weight: fontWeights.heading },
  h1: { fontSize: 24, lineHeight: 30, family: 'heading', weight: fontWeights.heading },
  h2: { fontSize: 20, lineHeight: 26, family: 'heading', weight: fontWeights.heading },
  body: { fontSize: 16, lineHeight: 24, family: 'body', weight: fontWeights.regular },
  bodyMedium: { fontSize: 16, lineHeight: 24, family: 'body', weight: fontWeights.medium },
  caption: { fontSize: 13, lineHeight: 18, family: 'body', weight: fontWeights.regular },
} as const;

export type TypeStyle = keyof typeof typeScale;

export const fontFeatures = { tabular: 'tnum' } as const;
