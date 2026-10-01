import { router } from 'expo-router';
import { View } from 'react-native';

import { AsyncContent } from '@/components/async-content';
import { Screen } from '@/components/screen';
import { Section } from '@/components/section';
import { Card, EmptyState, Icon, ListRow } from '@/components/ui';
import { repository } from '@/data';
import { useAsyncData } from '@/hooks/useAsyncData';
import { colors } from '@/theme/tokens';

/** Lista de eventos disponíveis para consulta. */
export default function UserEventsScreen() {
  const { state, reload } = useAsyncData(() => repository.listEvents());

  return (
    <Screen scrollable testID="user-events-screen">
      <AsyncContent
        state={state}
        onRetry={reload}
        loadingLabel="Carregando eventos…"
        isEmpty={(events) => events.length === 0}
        empty={
          <Card variant="soft">
            <EmptyState
              icon="calendar-blank-outline"
              title="Nenhum evento disponível"
              description="Quando o organizador criar um evento, ele aparece aqui para consulta."
            />
          </Card>
        }
      >
        {(events) => (
          <Section
            description={`${events.length} ${events.length === 1 ? 'evento' : 'eventos'} com mapas publicados`}
          >
            <View className="gap-4">
              {events.map((event) => (
                <ListRow
                  key={event.id}
                  icon={<Icon name="calendar-blank-outline" size={24} color={colors.primary} />}
                  title={event.name}
                  description={event.description ?? undefined}
                  trailing={<Icon name="chevron-right" size={24} color={colors.gray300} />}
                  onPress={() => router.push(`/user/event/${event.id}`)}
                  accessibilityLabel={`Ver as navegações do evento ${event.name}`}
                />
              ))}
            </View>
          </Section>
        )}
      </AsyncContent>
    </Screen>
  );
}
