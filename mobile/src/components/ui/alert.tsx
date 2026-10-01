import type { ReactNode } from 'react';
import { View, type ViewProps } from 'react-native';

import { colors } from '@/theme/tokens';

import { tv, type VariantProps } from '../../lib/tv';

import { Icon, type IconName } from './icon';
import { Text, type TextProps } from './text';

type AlertProps = ViewProps &
  VariantProps<typeof alertVariants> & {
    title?: string;
    description?: string;
    icon?: IconName;
    action?: ReactNode;
  };

/**
 * Mensagem de sistema: erro, aviso, sucesso ou informação.
 *
 * O fundo é o tom semântico a 10%, o ícone usa o tom cheio (elemento gráfico, que
 * só precisa de 3:1) e o texto usa o tom `*strong`, porque o tom do `design.md`
 * sozinho não atinge WCAG AA como texto — ver `src/theme/tokens.js`.
 */
export function Alert({ title, description, icon, action, className, tone, ...props }: AlertProps) {
  return (
    <View
      accessibilityLiveRegion="polite"
      className={alertVariants({ tone, className })}
      {...props}
    >
      <View className="flex-1 flex-row items-start gap-3">
        <Icon name={icon ?? toneIcon(tone)} size={20} color={toneColor(tone)} />
        <View className="flex-1 gap-1">
          {title ? (
            <Text variant="label" tint={toneTint(tone)}>
              {title}
            </Text>
          ) : null}
          {description ? (
            <Text variant="caption" tint={toneTint(tone)}>
              {description}
            </Text>
          ) : null}
        </View>
      </View>
      {action}
    </View>
  );
}

function toneIcon(tone: AlertProps['tone']): IconName {
  switch (tone) {
    case 'success':
      return 'check-circle-outline';
    case 'warning':
      return 'alert-outline';
    case 'error':
      return 'alert-circle-outline';
    default:
      return 'information-outline';
  }
}

/** O tom cheio serve para o ícone: ícone é elemento gráfico, não texto. */
function toneColor(tone: AlertProps['tone']): string {
  switch (tone) {
    case 'success':
      return colors.success;
    case 'warning':
      return colors.warning;
    case 'error':
      return colors.error;
    default:
      return colors.info;
  }
}

function toneTint(tone: AlertProps['tone']): NonNullable<TextProps['tint']> {
  switch (tone) {
    case 'success':
      return 'success';
    case 'warning':
      return 'warning';
    case 'error':
      return 'danger';
    default:
      return 'info';
  }
}

const alertVariants = tv({
  base: 'flex-row items-center gap-3 rounded-lg border p-4',
  variants: {
    tone: {
      info: 'bg-info/10 border-info/30',
      success: 'bg-success/10 border-success/30',
      warning: 'bg-warning/10 border-warning/30',
      error: 'bg-error/10 border-error/30',
    },
  },
  defaultVariants: {
    tone: 'info',
  },
});
