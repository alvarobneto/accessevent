import { Stack, router, useLocalSearchParams } from 'expo-router';

import { AsyncContent } from '@/components/async-content';
import { DeleteAction } from '@/components/delete-action';
import { NavigationDetailsView } from '@/components/navigation-details-view';
import { NavigationMenu } from '@/components/navigation-menu';
import { Screen } from '@/components/screen';
import { Button, EmptyState } from '@/components/ui';
import { repository } from '@/data';
import { useAsyncData } from '@/hooks/useAsyncData';
import { useRefreshOnFocus } from '@/hooks/useRefreshOnFocus';

/**
 * Detalhes da navegação: os dados que o organizador informou sobre o mapa. É o
 * destino de "Ver detalhes" no menu da tela da navegação, e repete o combinado do
 * evento: a tela do dia a dia mostra o que existe, os dados ficam num lugar só.
 *
 * Recarrega no foco pelo mesmo motivo da tela de detalhes do evento: o editor de
 * título é alcançado daqui e volta com `router.back()`.
 */
export default function NavigationDetailsScreen() {
  const { eventId, mapId } = useLocalSearchParams<{ eventId: string; mapId: string }>();
  const id = mapId ?? '';
  const event = eventId ?? '';

  const navigation = useAsyncData(() => repository.getNavigationMap(id), id);

  useRefreshOnFocus(navigation.reload);

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
              <>
                <NavigationDetailsView map={data} />

                <DeleteAction
                  subject="a navegação"
                  name={`“${data.name}”`}
                  consequence="Os caminhos e pontos registrados nela também serão apagados."
                  confirmLoadingLabel="Apagando a navegação…"
                  errorFallback="Não foi possível apagar a navegação."
                  onDelete={() => repository.deleteNavigationMap(id)}
                  onDeleted={() => router.dismissTo(`/organizer/event/${event}`)}
                  testID="delete-navigation-action"
                />
              </>
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
