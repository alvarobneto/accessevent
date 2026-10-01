import { router, useLocalSearchParams } from 'expo-router';

import { AsyncContent } from '@/components/async-content';
import { EventForm, toEventFormValues } from '@/components/event-form';
import { Screen } from '@/components/screen';
import { Button, EmptyState } from '@/components/ui';
import { repository } from '@/data';
import { useAsyncData } from '@/hooks/useAsyncData';

/** Editar Evento: os mesmos campos de "Criar evento", já preenchidos. */
export default function EditEventScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const id = eventId ?? '';

  const event = useAsyncData(() => repository.getEvent(id), id);

  return (
    <Screen scrollable testID="edit-event-screen">
      <AsyncContent state={event.state} onRetry={event.reload} loadingLabel="Carregando o evento…">
        {(data) =>
          data ? (
            <EventForm
              initialValues={toEventFormValues(data)}
              submitLabel="Salvar alterações"
              submitLoadingLabel="Salvando…"
              onSubmit={async (values) => {
                await repository.updateEvent(id, values);
                // `back()` devolve para "Gerenciar evento", que recarrega os
                // dados quando volta a ficar em foco.
                router.back();
              }}
            />
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
  );
}
