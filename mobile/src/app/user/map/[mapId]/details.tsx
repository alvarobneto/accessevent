import { Stack, router, useLocalSearchParams } from 'expo-router';

import { AsyncContent } from '@/components/async-content';
import { NavigationDetailsView } from '@/components/navigation-details-view';
import { Screen } from '@/components/screen';
import { Button, EmptyState } from '@/components/ui';
import { repository } from '@/data';
import { useAsyncData } from '@/hooks/useAsyncData';

/**
 * Detalhes do mapa, em modo de consulta. Irmã de `/user/map/[mapId]`, que é a
 * tela do mapa em si: por isso o caminho é `/user/map/[mapId]/details` e não
 * aninhado no evento, como no organizador.
 */
export default function UserMapDetailsScreen() {
  const { mapId } = useLocalSearchParams<{ mapId: string }>();
  const id = mapId ?? '';

  const map = useAsyncData(() => repository.getNavigationMap(id), id);

  return (
    <>
      {/* Sem menu: no modo participante o único item seria "Ver detalhes", que é
          esta própria tela. */}
      <Stack.Screen options={{ title: 'Detalhes do mapa' }} />

      <Screen scrollable testID="user-map-details-screen">
        <AsyncContent state={map.state} onRetry={map.reload} loadingLabel="Carregando o mapa…">
          {(data) =>
            data ? (
              <NavigationDetailsView map={data} />
            ) : (
              <EmptyState
                icon="map-search-outline"
                title="Mapa não encontrado"
                description="Ele pode ter sido removido desde que esta tela foi aberta."
              >
                <Button label="Voltar" variant="outline" onPress={() => router.back()} />
              </EmptyState>
            )
          }
        </AsyncContent>
      </Screen>
    </>
  );
}
