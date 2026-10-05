import { router } from 'expo-router';
import { Pressable } from 'react-native';

import { Screen } from '@/components/screen';
import { Text, Card, Icon } from '@/components/ui';
import { colors } from '@/theme/tokens';

export default function MapaTab() {
  return (
    <Screen scrollable contentClassName="gap-4 px-5 pb-8 pt-6">
      <Text variant="heading">Mapa</Text>
      <Card variant="soft" className="h-96 items-center justify-center">
        <Icon name="map-outline" size={32} color={colors.primary} />
        <Text variant="label" className="mt-2">
          Mapa da navegação
        </Text>
        <Text variant="caption" tint="muted" centered className="mt-1 max-w-xs">
          Navegue até Explorar e toque em um evento para ver o mapa com a rota recomendada.
        </Text>
        <Pressable
          onPress={() => router.push('/user/map/exemplo')}
          className="mt-4 rounded-xl bg-primary px-4 py-2"
        >
          <Text tint="inverse">Ver mapa exemplo</Text>
        </Pressable>
      </Card>
    </Screen>
  );
}
