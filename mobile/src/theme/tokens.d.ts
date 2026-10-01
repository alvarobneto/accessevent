import tokens from './tokens.js';

export const { colors, spacing, screenPadding, radius, touchTarget, fontSize, headerTheme } =
  tokens;

export type Colors = typeof colors;
export type FontSize = typeof fontSize;
export type FontSizeToken = keyof FontSize;
export type HeaderTheme = typeof headerTheme;
