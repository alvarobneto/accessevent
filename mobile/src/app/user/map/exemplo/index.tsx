import { Pressable, View } from 'react-native';

import { EventMap } from '@/components/map';
import { Screen } from '@/components/screen';
import { Icon, Text } from '@/components/ui';
import { colors } from '@/theme/tokens';
import type { MapMarker, MapPolyline } from '@/types/map';

const EXAMPLE_MARKERS: MapMarker[] = [
  {
    id: 'entrada',
    coordinate: [-23.5621, -46.6564],
    label: 'Entrada principal',
    icon: 'entrance',
    tone: 'default',
  },
  {
    id: 'banheiro',
    coordinate: [-23.5615, -46.6552],
    label: 'Banheiro',
    icon: 'human-wheelchair',
    tone: 'default',
  },
  {
    id: 'auditorio',
    coordinate: [-23.5608, -46.6562],
    label: 'Auditório Principal',
    icon: 'map-marker',
    tone: 'highlight',
  },
];

const EXAMPLE_POLYLINES: MapPolyline[] = [
  {
    id: 'rota-entrada-auditorio',
    geometry: [
      [-23.5621, -46.6564],
      [-23.5618, -46.6558],
      [-23.5615, -46.6552],
      [-23.5611, -46.6556],
      [-23.5608, -46.6562],
    ],
    tone: 'highlight',
  },
];

export default function MapaExemploScreen() {
  return (
    <Screen scrollable={false} contentClassName="flex-1">
      <View className="px-4 py-3">
        <Text variant="label">Festival Cidade Aberta</Text>
      </View>

      <View className="relative flex-1">
        <EventMap
          className="flex-1"
          markers={EXAMPLE_MARKERS}
          polylines={EXAMPLE_POLYLINES}
          accessibilityLabel="Mapa de exemplo do Festival Cidade Aberta"
          fitPadding={36}
        />

        <View
          pointerEvents="none"
          className="absolute left-4 top-4 rounded-lg bg-white/95 px-2.5 py-1.5 shadow-sm"
        >
          <Text variant="caption">Auditório</Text>
          <Text variant="caption" tint="muted">
            Principal
          </Text>
        </View>
        <View
          pointerEvents="none"
          className="absolute right-16 top-16 flex-row items-center gap-1 rounded-lg bg-white/95 px-2.5 py-1.5 shadow-sm"
        >
          <Icon name="wheelchair-accessibility" size={20} color={colors.primary} />
          <Text variant="caption">Banheiro</Text>
        </View>
        <View
          pointerEvents="none"
          className="absolute bottom-14 left-4 rounded-lg bg-white/95 px-2.5 py-1.5 shadow-sm"
        >
          <Text variant="caption">↗ Entrada</Text>
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
