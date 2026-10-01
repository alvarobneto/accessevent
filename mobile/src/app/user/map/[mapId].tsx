import { Stack, router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { AsyncContent } from '@/components/async-content';
import { NavigationMenu } from '@/components/navigation-menu';
import { Screen } from '@/components/screen';
import { Alert, Button, Card, EmptyState, Icon, Text } from '@/components/ui';
import { repository } from '@/data';
import { useAsyncData } from '@/hooks/useAsyncData';
import { colors } from '@/theme/tokens';

/**
 * Mapa da navegação. A renderização com react-native-maps entra na Sprint 3.
 *
 * A tela é o mapa; os dados que o organizador informou sobre ele (nome, datas)
 * ficam em `/user/map/[mapId]/details`, atrás do menu de três pontinhos.
 */
export default function UserMapScreen() {
  const { mapId } = useLocalSearchParams<{ mapId: string }>();
  const id = mapId ?? '';

  const { state, reload } = useAsyncData(() => repository.getNavigationMap(id), id);

  const mapName = state.status === 'success' ? state.data?.name : null;

  return (
    <>
      <Stack.Screen
        options={{
          title: mapName ?? 'Mapa',
          headerRight: () => (
            <NavigationMenu mode="user" mapId={id} mapName={mapName ?? undefined} />
          ),
        }}
      />

      <Screen scrollable testID="user-map-screen">
        <AsyncContent state={state} onRetry={reload} loadingLabel="Carregando o mapa…">
          {(data) =>
            data ? (
              <>
                <View className="h-64 items-center justify-center gap-4 rounded-lg border border-dashed border-gray-300 bg-background p-6">
                  <Icon name="map-outline" size={32} color={colors.gray300} />
                  <Text variant="subheading" centered>
                    Mapa do evento
                  </Text>
                  <Text variant="caption" centered className="max-w-xs">
                    O mapa desenhado pelo organizador aparece aqui, com os pontos de interesse e as
                    informações de acessibilidade.
                  </Text>
                </View>

                <Alert
                  tone="info"
                  title="Dados informados pelo organizador"
                  description="As características de acessibilidade não são verificadas automaticamente. Confira a data da última atualização antes de seguir por um caminho."
                />

                <Card variant="soft">
                  <View className="gap-2">
                    <View className="flex-row items-center gap-2">
                      <Icon name="human-wheelchair" size={20} color={colors.primary} />
                      <Text variant="label">Rotas dentro do mapa</Text>
                    </View>
                    <Text variant="caption">
                      Em breve você vai escolher um destino e informar suas restrições, como evitar
                      escadas. O aplicativo calcula o caminho dentro do mapa.
                    </Text>
                  </View>
                </Card>

                <Button
                  label="Voltar às navegações"
                  variant="ghost"
                  onPress={() => router.back()}
                />
              </>
            ) : (
              <EmptyState
                icon="map-search-outline"
                title="Mapa não encontrado"
                description="Ele pode ter sido removido desde que esta tela foi aberta."
              >
                <Button label="Voltar" variant="outline" onPress={() => router.replace('/user')} />
              </EmptyState>
            )
          }
        </AsyncContent>
      </Screen>
    </>
  );
}
