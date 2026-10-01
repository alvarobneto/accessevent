import { Stack, router, useLocalSearchParams } from 'expo-router';

import { AsyncContent } from '@/components/async-content';
import { NavigationDetailsView } from '@/components/navigation-details-view';
import { NavigationMenu } from '@/components/navigation-menu';
import { Screen } from '@/components/screen';
import { Button, EmptyState } from '@/components/ui';
import { repository } from '@/data';
import { useAsyncData } from '@/hooks/useAsyncData';

/**
 * Detalhes da navegação: os dados que o organizador informou sobre o mapa. É o
 * destino de "Ver detalhes" no menu da tela da navegação, e repete o combinado do
 * evento: a tela do dia a dia mostra o que existe, os dados ficam num lugar só.
 */
export default function NavigationDetailsScreen() {
  const { mapId } = useLocalSearchParams<{ mapId: string }>();
  const id = mapId ?? '';

  const navigation = useAsyncData(() => repository.getNavigationMap(id), id);

  const mapName = navigation.state.status === 'success' ? navigation.state.data?.name : null;

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Detalhes da navegação',
          headerRight: () => (
            <NavigationMenu mapId={id} mapName={mapName ?? undefined} showDetails={false} />
          ),
        }}
      />

      <Screen scrollable testID="navigation-details-screen">
        <AsyncContent
          state={navigation.state}
          onRetry={navigation.reload}
          loadingLabel="Carregando a navegação…"
        >
          {(data) =>
            data ? (
              <NavigationDetailsView map={data} />
            ) : (
              <EmptyState
                icon="map-search-outline"
                title="Navegação não encontrada"
                description="Ela pode ter sido removida desde que esta tela foi aberta."
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
