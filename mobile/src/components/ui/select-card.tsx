import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { colors } from '@/theme/tokens';

import { tv, type VariantProps } from '../../lib/tv';

import { Icon } from './icon';
import { Text } from './text';

type SelectCardProps = VariantProps<typeof selectCardVariants> & {
  icon: ReactNode;
  title: string;
  description: string;
  onPress: () => void;
  testID?: string;
  className?: string;
};

/** Cartão de escolha: área grande, ícone, título e descrição. */
export function SelectCard({
  icon,
  title,
  description,
  onPress,
  className,
  testID,
}: SelectCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${description}`}
      accessibilityHint="Abre esta área do aplicativo"
      onPress={onPress}
      testID={testID}
      className={selectCardVariants({ className })}
    >
      <View className="size-12 items-center justify-center rounded-md bg-primary-50">{icon}</View>

      <View className="flex-1 gap-1">
        <Text variant="heading">{title}</Text>
        <Text variant="caption">{description}</Text>
      </View>

      <Icon name="arrow-right" size={20} color={colors.gray400} />
    </Pressable>
  );
}

const selectCardVariants = tv({
  base: 'w-full flex-row items-center gap-4 rounded-lg border border-border bg-background p-4 shadow-sm active:bg-gray-50 active:opacity-80',
});
