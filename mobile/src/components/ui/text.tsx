import { Text as RNText } from 'react-native';

import { tv, type VariantProps } from '../../lib/tv';

export type TextProps = RNText['props'] & VariantProps<typeof textVariants>;

/**
 * Base tipográfica do app. Toda tela escreve com `Text` daqui para manter a
 * hierarquia e o contraste consistentes.
 *
 * Os oito `variant` são os oito papéis da escala do `design.md` — `display`, `h1`
 * (title), `h2` (heading), `h3` (subheading), `body`, `bodyMedium` (label) e
 * `caption`. Nada aqui renderiza abaixo de 14px.
 */
export function Text({ className, variant, tint, centered, highContrast, ...props }: TextProps) {
  return (
    <RNText
      className={textVariants({ variant, tint, centered, highContrast, className })}
      {...props}
    />
  );
}

const textVariants = tv({
  base: 'font-regular',
  variants: {
    variant: {
      /** `typography.display` — 32/40, bold. */
      display: 'text-display font-bold tracking-tight text-content',
      /** `typography.h1` — 28/36, bold. */
      title: 'text-h1 font-bold tracking-tight text-content',
      /** `typography.h2` — 24/32, semibold. */
      heading: 'text-h2 font-semibold tracking-tight text-content',
      /** `typography.h3` — 20/28, semibold. */
      subheading: 'text-h3 font-semibold text-content',
      /** `typography.body` — 16/24, regular. */
      body: 'text-body text-content',
      /** `typography.bodyMedium` — 16/24, medium. Rótulos e chamadas de ação. */
      label: 'text-body font-medium text-content',
      /** Corpo secundário: 16/24 em `muted`, que mantém 7,24:1 sobre `surface`. */
      callout: 'text-body text-muted',
      /** `typography.caption` — 14/20. O menor texto permitido (Acessibilidade). */
      caption: 'text-caption text-muted',
    },
    tint: {
      default: '',
      primary: 'text-primary',
      info: 'text-info-strong',
      success: 'text-success-strong',
      warning: 'text-warning-strong',
      danger: 'text-error-strong',
      muted: 'text-muted',
      inverse: 'text-white',
    },
    centered: { true: 'text-center' },
    highContrast: { true: '!text-content' },
  },
  defaultVariants: {
    variant: 'body',
  },
});
