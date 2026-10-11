import { Stack, router, useLocalSearchParams } from 'expo-router';

import { AsyncContent } from '@/components/async-content';
import { EventDetailsView } from '@/components/event-details-view';
import { Screen } from '@/components/screen';
import { Button, EmptyState } from '@/components/ui';
import { repository } from '@/data';
import { useAsyncData } from '@/hooks/useAsyncData';
import { useRefreshOnFocus } from '@/hooks/useRefreshOnFocus';

/**
 * Detalhes do evento, em modo de consulta. Mostra os mesmos dados da tela
 * equivalente do organizador (`EventDetailsView`); o que muda é que aqui não há
 * edição, então nem o cabeçalho ganha menu.
 *
 * Recarrega no foco porque o organizador edita o evento em outra tela do app: sem
 * isto, os dados ficariam presos ao que era quando a tela abriu.
 */
export default function UserEventDetailsScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const id = eventId ?? '';

  const event = useAsyncData(() => repository.getEvent(id), id);

  useRefreshOnFocus(event.reload);

  return (
    <>
      <Stack.Screen options={{ title: 'Detalhes do evento' }} />

      <Screen
        scrollable
        onRefresh={event.reload}
        refreshing={event.refreshing}
        testID="user-event-details-screen"
      >
        <AsyncContent
          state={event.state}
          onRetry={event.reload}
          loadingLabel="Carregando o evento…"
        >
          {(data) =>
            data ? (
              <EventDetailsView event={data} />
            ) : (
              <EmptyState
                icon="map-search-outline"
                title="Evento não encontrado"
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
