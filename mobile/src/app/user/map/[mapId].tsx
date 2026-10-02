import { Stack, router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { AsyncContent } from '@/components/async-content';
import { EventMap } from '@/components/map';
import { NavigationMenu } from '@/components/navigation-menu';
import { Screen } from '@/components/screen';
import { Alert, Button, Card, EmptyState, Icon, Text } from '@/components/ui';
import { repository } from '@/data';
import { useAsyncData } from '@/hooks/useAsyncData';
import { useRefreshOnFocus } from '@/hooks/useRefreshOnFocus';
import { colors } from '@/theme/tokens';

/**
 * Mapa da navegação: a tela é o mapa que o organizador desenhou.
 *
 * O desenho é o `EventMap` (Sprint 3); os pontos, os caminhos e as áreas chegam
 * nas Sprints 5 a 8, e o destino com as restrições de acessibilidade nas Sprints
 * 14 a 18. Os dados que o organizador informou sobre a navegação (nome, datas)
 * ficam em `/user/map/[mapId]/details`, atrás do menu de três pontinhos.
 *
 * Recarrega no foco para o título do cabeçalho e os caminhos desenhados refletirem
 * o que o organizador mudou depois que a tela foi aberta.
 */
export default function UserMapScreen() {
  const { mapId } = useLocalSearchParams<{ mapId: string }>();
  const id = mapId ?? '';

  const { state, reload } = useAsyncData(() => repository.getNavigationMap(id), id);

  useRefreshOnFocus(reload);

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
                <View className="gap-2">
                  <EventMap
                    className="h-72 rounded-lg border border-border"
                    accessibilityLabel="Mapa da navegação"
                  />
                  <Text variant="caption">
                    Os caminhos registrados pelo organizador e os pontos de interesse aparecem
                    desenhados neste mapa.
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
