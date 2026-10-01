import { Stack, router, useLocalSearchParams } from 'expo-router';

import { AsyncContent } from '@/components/async-content';
import { EventMenu } from '@/components/event-menu';
import { EventDetailsView } from '@/components/event-details-view';
import { Screen } from '@/components/screen';
import { Button, EmptyState } from '@/components/ui';
import { repository } from '@/data';
import { useAsyncData } from '@/hooks/useAsyncData';

/**
 * Detalhes do evento: tudo o que o organizador informou sobre ele, em uma tela
 * só. É o destino de "Ver detalhes" no menu da tela do evento.
 */
export default function EventDetailsScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const id = eventId ?? '';

  const event = useAsyncData(() => repository.getEvent(id), id);

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Detalhes do evento',
          headerRight: () => <EventMenu eventId={id} showDetails={false} />,
        }}
      />

      <Screen scrollable testID="event-details-screen">
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
                <Button
                  label="Voltar"
                  variant="outline"
                  onPress={() => router.replace('/organizer')}
                />
              </EmptyState>
            )
          }
        </AsyncContent>
      </Screen>
    </>
  );
}
