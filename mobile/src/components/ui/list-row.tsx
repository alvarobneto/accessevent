import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { tv } from '../../lib/tv';

import { Text } from './text';

type ListRowProps = {
  title: string;
  description?: string;
  /** Linha secundária, como data ou contagem. */
  meta?: string;
  icon?: ReactNode;
  trailing?: ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
  className?: string;
};

/**
 * Linha de lista. Serve para eventos e para navegações, com o mesmo formato:
 * ícone opcional, título, descrição e uma ação à direita.
 */
export function ListRow({
  title,
  description,
  meta,
  icon,
  trailing,
  onPress,
  accessibilityLabel,
  className,
}: ListRowProps) {
  const content = (
    <View className={rowVariants({ className })}>
      {icon ? <View>{icon}</View> : null}

      <View className="flex-1 gap-1">
        <Text variant="subheading" numberOfLines={2}>
          {title}
        </Text>
        {description ? (
          <Text variant="caption" numberOfLines={2}>
            {description}
          </Text>
        ) : null}
        {meta ? <Text variant="caption">{meta}</Text> : null}
      </View>

      {trailing}
    </View>
  );

  if (!onPress) {
    return content;
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      onPress={onPress}
      className="rounded-lg active:opacity-70"
    >
      {content}
    </Pressable>
  );
}

const rowVariants = tv({
  base: 'flex-row items-center gap-3 rounded-lg border border-border bg-background p-4',
});
