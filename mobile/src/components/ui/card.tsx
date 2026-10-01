import type { ReactNode } from 'react';
import { View, type ViewProps } from 'react-native';

import { tv, type VariantProps } from '../../lib/tv';

import { Text } from './text';

type CardProps = ViewProps &
  VariantProps<typeof cardVariants> & {
    title?: string;
    subtitle?: string;
    /** Elemento à direita do título, como um botão de ação. */
    trailing?: ReactNode;
    footer?: ReactNode;
  };

/**
 * Superfície base do app.
 *
 * O `design.md` fixa o card em `backgroundColor` branco, `borderRadius: 16`,
 * `padding: 16`, borda de 1px em `gray200` — que é exatamente o `outline` abaixo.
 */
export function Card({
  title,
  subtitle,
  trailing,
  footer,
  className,
  variant,
  ...props
}: CardProps) {
  const hasHeader = Boolean(title || subtitle || trailing);

  return (
    <View className={cardVariants({ variant, className })} {...props}>
      {hasHeader ? (
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1 gap-1">
            {title ? <Text variant="heading">{title}</Text> : null}
            {subtitle ? <Text variant="caption">{subtitle}</Text> : null}
          </View>
          {trailing}
        </View>
      ) : null}
      {props.children}
      {footer ? <View className="mt-4">{footer}</View> : null}
    </View>
  );
}

const cardVariants = tv({
  base: 'rounded-lg p-4 gap-4',
  variants: {
    variant: {
      /** Padrão do `design.md`: branco, raio 16, padding 16, borda 1px. */
      outline: 'bg-background border border-border',
      /** Mesmo cartão, com a sombra discreta em vez da borda. */
      elevated: 'bg-background border border-border shadow-sm',
      /** Fundo neutro, para agrupar conteúdo sem dar peso visual. */
      soft: 'bg-gray-50 border border-gray-100',
      /** Destaque azul, para a ação principal da tela. */
      highlight: 'bg-primary-50 border border-primary-100',
    },
  },
  defaultVariants: {
    variant: 'outline',
  },
});
