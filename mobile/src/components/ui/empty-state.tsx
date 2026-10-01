import type { ReactNode } from 'react';
import { View } from 'react-native';

import { colors } from '@/theme/tokens';

import { tv, type VariantProps } from '../../lib/tv';

import { Icon, type IconName } from './icon';
import { Text } from './text';

type EmptyStateProps = VariantProps<typeof emptyStateVariants> & {
  icon?: IconName;
  title: string;
  description?: string;
  children?: ReactNode;
  compact?: boolean;
  className?: string;
};

/** Estado vazio: explica o que falta e, quando dá, oferece a próxima ação. */
export function EmptyState({
  icon = 'map-outline',
  title,
  description,
  children,
  compact,
  className,
}: EmptyStateProps) {
  return (
    <View className={emptyStateVariants({ compact, className })}>
      <View className="size-12 items-center justify-center rounded-md bg-gray-100">
        <Icon name={icon} size={24} color={colors.gray500} />
      </View>
      <Text variant="subheading" centered>
        {title}
      </Text>
      {description ? (
        <Text variant="caption" centered className="max-w-sm">
          {description}
        </Text>
      ) : null}
      {children ? <View className="mt-2 w-full">{children}</View> : null}
    </View>
  );
}

const emptyStateVariants = tv({
  base: 'items-center gap-3 py-6',
  variants: {
    compact: { true: 'py-3' },
  },
});
