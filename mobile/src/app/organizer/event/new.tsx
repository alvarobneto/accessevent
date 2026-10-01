import { router } from 'expo-router';

import { EventForm } from '@/components/event-form';
import { Screen } from '@/components/screen';
import { Text } from '@/components/ui';
import { repository } from '@/data';

/** Criar evento: só o nome é obrigatório, o resto é opcional (PRD §9.1). */
export default function NewEventScreen() {
  return (
    <Screen scrollable testID="new-event-screen">
      <Text variant="callout">
        O evento agrupa as navegações — um mapa para cada andar, bloco ou área externa.
      </Text>

      <EventForm
        submitLabel="Criar evento"
        submitLoadingLabel="Criando…"
        onSubmit={async (values) => {
          const event = await repository.createEvent(values);
          router.replace(`/organizer/event/${event.id}`);
        }}
      />
    </Screen>
  );
}
