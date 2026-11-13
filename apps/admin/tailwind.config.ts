import type { Config } from 'tailwindcss';
import { tailwindPreset } from '@datapal/ui-tokens/tailwind-preset';

const config: Config = {
  presets: [tailwindPreset as Config],
  content: ['./src/**/*.{ts,tsx}', '../../packages/ui-web/src/**/*.{ts,tsx}'],
};

export default config;
