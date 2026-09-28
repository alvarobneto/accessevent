/**
 * Tokens visuais do aplicativo.
 *
 * As cores foram escolhidas para atender ao requisito RNF04 (acessibilidade da
 * própria interface): textos e fundos mantêm contraste alto e os alvos de toque
 * respeitam o tamanho mínimo recomendado de 44–48px.
 */

export const colors = {
  background: '#FFFFFF',
  surface: '#F4F5F7',
  border: '#D6D9DE',
  text: '#14181F',
  textMuted: '#52596A',
  primary: '#1B4FD8',
  primaryText: '#FFFFFF',
  success: '#1B6E3C',
  warning: '#8A5A00',
  danger: '#B3261E',
  disabled: '#9AA1AC',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
} as const;

/** Altura mínima de qualquer alvo tocável, em pixels. */
export const MIN_TOUCH_TARGET = 48;

export const typography = {
  title: { fontSize: 24, fontWeight: '700' },
  heading: { fontSize: 18, fontWeight: '600' },
  body: { fontSize: 16, fontWeight: '400' },
  label: { fontSize: 14, fontWeight: '600' },
  caption: { fontSize: 14, fontWeight: '400' },
} as const;
