import { Stack, router, useLocalSearchParams } from 'expo-router';

import { AsyncContent } from '@/components/async-content';
import { DeleteAction } from '@/components/delete-action';
import { EventMenu } from '@/components/event-menu';
import { EventDetailsView } from '@/components/event-details-view';
import { Screen } from '@/components/screen';
import { Button, EmptyState } from '@/components/ui';
import { repository } from '@/data';
import { useAsyncData } from '@/hooks/useAsyncData';
import { useRefreshOnFocus } from '@/hooks/useRefreshOnFocus';

/**
 * Detalhes do evento: tudo o que o organizador informou sobre ele, em uma tela
 * só. É o destino de "Ver detalhes" no menu da tela do evento.
 *
 * A tela do participante mostra os mesmos dados sem a seção de apagar: o menu é o
 * que separa os dois modos, e apagar é do organizador.
 *
 * Recarrega no foco porque "Editar evento" sai daqui mesmo, pelo menu: sem isso a
 * tela voltaria do editor mostrando o nome antigo.
 */
export default function EventDetailsScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const id = eventId ?? '';

  const event = useAsyncData(() => repository.getEvent(id), id);

  useRefreshOnFocus(event.reload);

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
              <>
                <EventDetailsView event={data} />

                <DeleteAction
                  subject="o evento"
                  name={`“${data.name}”`}
                  consequence="As navegações registradas nele também serão apagadas."
                  confirmLoadingLabel="Apagando o evento…"
                  errorFallback="Não foi possível apagar o evento."
                  onDelete={() => repository.deleteEvent(id)}
                  onDeleted={() => router.replace('/user')}
                  testID="delete-event-action"
                />
              </>
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
