export const fontFamilies = {
  heading: 'Bricolage Grotesque',
  body: 'Plus Jakarta Sans',
} as const;

export const fontWeights = { heading: '700', regular: '400', medium: '500', semibold: '600' } as const;

export const typeScale = {
  display: { fontSize: 34, lineHeight: 40, family: 'heading', weight: fontWeights.heading },
  h1: { fontSize: 28, lineHeight: 34, family: 'heading', weight: fontWeights.heading },
  h2: { fontSize: 20, lineHeight: 26, family: 'heading', weight: fontWeights.heading },
  body: { fontSize: 15, lineHeight: 23, family: 'body', weight: fontWeights.regular },
  bodyMedium: { fontSize: 15, lineHeight: 23, family: 'body', weight: fontWeights.medium },
  caption: { fontSize: 13, lineHeight: 18, family: 'body', weight: fontWeights.regular },
} as const;

export type TypeStyle = keyof typeof typeScale;

export const fontFeatures = { tabular: 'tnum' } as const;
