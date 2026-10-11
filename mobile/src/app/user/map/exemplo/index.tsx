import { View, Pressable } from 'react-native';

import { Screen } from '@/components/screen';
import { Text, Icon, IconButton } from '@/components/ui';
import { colors } from '@/theme/tokens';

export default function MapaExemploScreen() {
  return (
    <Screen scrollable={false} contentClassName="flex-1">
      <View className="px-4 py-3">
        <Text variant="label">Festival Cidade Aberta</Text>
      </View>

      <View className="flex-1 items-center justify-center bg-gray-100">
        <View className="absolute left-12 top-16 rounded-lg bg-white px-2 py-1 shadow-sm">
          <Text variant="caption">Auditório</Text>
          <Text variant="caption" tint="muted">
            Principal
          </Text>
        </View>
        <View className="absolute right-10 top-40 flex-row items-center gap-1 rounded-lg bg-white px-2 py-1 shadow-sm">
          <Icon name="wheelchair-accessibility" size={20} color={colors.primary} />
          <Text variant="caption">Banheiro</Text>
        </View>
        <View className="absolute bottom-40 left-8 rounded-lg bg-white px-2 py-1 shadow-sm">
          <Text variant="caption">↗ Entrada</Text>
        </View>
        <View className="h-8 w-8 items-center justify-center rounded-full bg-primary">
          <Icon name="map-marker" size={20} color={colors.white} />
        </View>
        <View className="absolute right-2 top-2 flex-row gap-1 rounded-lg border border-border bg-background p-1 shadow-sm">
          <IconButton
            icon="plus"
            size="sm"
            accessibilityLabel="Aumentar o mapa"
            onPress={() => undefined}
            testID="map-zoom-in"
          />
          <IconButton
            icon="minus"
            size="sm"
            accessibilityLabel="Reduzir o mapa"
            onPress={() => undefined}
            testID="map-zoom-out"
          />
        </View>
      </View>

      <View className="rounded-t-3xl bg-white px-5 pb-6 pt-3 shadow-lg">
        <View className="mx-auto mb-4 h-1 w-10 rounded-full bg-gray-200" />
        <Text variant="caption">Rota recomendada</Text>
        <Text variant="heading" className="mt-1">
          Entrada principal → Auditório
        </Text>
        <View className="mt-3 flex-row items-center gap-4">
          <Text variant="caption">
            <Text variant="label">4 min</Text> a pé
          </Text>
          <Text variant="caption">
            <Text variant="label">180 m</Text> distância
          </Text>
          <View className="flex-row items-center gap-1">
            <Icon name="wheelchair-accessibility" size={20} color={colors.primary} />
            <Text variant="caption" tint="primary">
              acessível
            </Text>
          </View>
        </View>
        <Pressable className="mt-4 flex-row items-center justify-center gap-2 rounded-xl bg-primary py-3">
          <Text tint="inverse" variant="label">
            Iniciar rota
          </Text>
          <Icon name="arrow-right" size={20} color={colors.white} />
        </Pressable>
      </View>
    </Screen>
  );
}
