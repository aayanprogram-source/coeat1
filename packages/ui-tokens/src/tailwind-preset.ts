import type { Config } from 'tailwindcss';
import { colors, semantic } from './colors';
import { radius, shadowCss, spacing } from './layout';
import { motion } from './motion';
import { fontFamilies, typeScale } from './typography';

const px = (n: number) => `${n}px`;

export const tailwindPreset: Partial<Config> = {
  theme: {
    extend: {
      colors: {
        green: { 900: colors.green900, 700: colors.green700 },
        saffron: { 500: colors.saffron500 },
        coral: { 500: colors.coral500 },
        mint: { 100: colors.mint100 },
        background: semantic.background,
        surface: semantic.surface,
        ink: semantic.text,
        muted: semantic.textMuted,
        line: semantic.border,
        success: semantic.success,
        danger: semantic.danger,
        primary: { DEFAULT: semantic.primary, hover: semantic.primaryHover, fg: semantic.onPrimary },
        accent: { DEFAULT: semantic.accent, fg: semantic.onAccent },
      },
      fontFamily: {
        heading: ['var(--font-heading)', fontFamilies.heading, 'serif'],
        body: ['var(--font-body)', fontFamilies.body, 'system-ui', 'sans-serif'],
      },
      fontSize: {
        display: [px(typeScale.display.fontSize), { lineHeight: px(typeScale.display.lineHeight) }],
        h1: [px(typeScale.h1.fontSize), { lineHeight: px(typeScale.h1.lineHeight) }],
        h2: [px(typeScale.h2.fontSize), { lineHeight: px(typeScale.h2.lineHeight) }],
        body: [px(typeScale.body.fontSize), { lineHeight: px(typeScale.body.lineHeight) }],
        caption: [px(typeScale.caption.fontSize), { lineHeight: px(typeScale.caption.lineHeight) }],
      },
      spacing: Object.fromEntries(Object.entries(spacing).map(([k, v]) => [k, px(v)])),
      borderRadius: {
        card: px(radius.card),
        button: px(radius.button),
        chip: px(radius.chip),
        sheet: px(radius.sheet),
        input: px(radius.input),
      },
      boxShadow: { low: shadowCss.low, mid: shadowCss.mid },
      transitionDuration: {
        fast: `${motion.durationFast}ms`,
        base: `${motion.durationBase}ms`,
        slow: `${motion.durationSlow}ms`,
      },
      transitionTimingFunction: { out: motion.easing },
    },
  },
};
