import { View } from 'react-native';

import { Text } from '@/components/ui';

/** Uma linha rótulo/valor das telas de detalhes; o `Card` já dá o respiro entre elas. */
export function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-baseline justify-between gap-4">
      <Text variant="caption">{label}</Text>
      <Text variant="caption" tint="muted" className="flex-1 text-right">
        {value}
      </Text>
    </View>
  );
}
