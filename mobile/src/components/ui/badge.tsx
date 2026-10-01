import { View, type ViewProps } from 'react-native';

import { tv, type VariantProps } from '../../lib/tv';

import { Text } from './text';

type BadgeProps = ViewProps &
  VariantProps<typeof badgeVariants> & {
    label: string;
  };

/** Etiqueta compacta para status e contadores. */
export function Badge({ label, className, tone, ...props }: BadgeProps) {
  return (
    <View className={badgeVariants({ tone, className })} {...props}>
      <Text
        variant="caption"
        tint={tone === 'primary' ? 'primary' : 'muted'}
        className="font-semibold"
      >
        {label}
      </Text>
    </View>
  );
}

const badgeVariants = tv({
  base: 'self-start rounded-full px-2 py-1',
  variants: {
    tone: {
      neutral: 'bg-gray-100',
      primary: 'bg-primary-50',
      success: 'bg-success/10',
      warning: 'bg-warning/10',
      danger: 'bg-error/10',
    },
  },
  defaultVariants: {
    tone: 'neutral',
  },
});
