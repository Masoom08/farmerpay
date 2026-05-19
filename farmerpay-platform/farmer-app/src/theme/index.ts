/**
 * TRUST v2 — Mobile restyle theme
 *
 * Single source of truth for all mobile styling tokens.
 * Farmer app stays light-only (spec §8.5); darkTheme is a stub.
 */

import { createTheme } from '@shopify/restyle';
import { palette } from './colors';
import { spacing, touchTarget } from './spacing';
import { textVariants } from './text';

export { touchTarget } from './spacing';
export { bandColors, brand, neutral, decision, pillar } from './colors';

const theme = createTheme({
  colors: palette,
  spacing,
  breakpoints: {
    phone: 0,
    tablet: 768,
  },
  borderRadii: {
    sm: 4,
    md: 8,
    lg: 12,
    pill: 9999,
  },
  textVariants,
});

export type Theme = typeof theme;

/**
 * Dark theme stub — farmer app is light-only per spec §8.5.
 * Exported for API completeness but NOT shipped in farmer-app.
 */
export const darkTheme: Theme = {
  ...theme,
  colors: {
    ...theme.colors,
    background: '#171717',
    foreground: '#FAFAFA',
  },
};

export default theme;
