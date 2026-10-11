import { router, Stack, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { AsyncContent } from '@/components/async-content';
import { Screen } from '@/components/screen';
import { Section } from '@/components/section';
import { Card, EmptyState, Icon, ListRow, Text } from '@/components/ui';
import { repository } from '@/data';
import type { EventCategory } from '@/data/types';
import { useAsyncData } from '@/hooks/useAsyncData';
import { useRefreshOnFocus } from '@/hooks/useRefreshOnFocus';
import { colors } from '@/theme/tokens';
import { eventCategoryIcon, eventCategoryLabel } from '@/utils/event-categories';

/**
 * Eventos de uma categoria. A categoria vem da rota; chaves que não constam de
 * `EventCategory` devolvem uma lista vazia da API, o que já vira o estado
 * "nenhum evento nesta categoria".
 */
export default function CategoryEventsScreen() {
  const { category } = useLocalSearchParams<{ category: string }>();
  const key = (category ?? '') as EventCategory;
  const label = eventCategoryLabel(key);

  const { state, reload, refreshing } = useAsyncData(() => repository.listEvents(key), key);

  useRefreshOnFocus(reload);

  return (
    <Screen
      scrollable
      onRefresh={reload}
      refreshing={refreshing}
      testID="category-events-screen"
    >
      <Stack.Screen options={{ title: label }} />

      <View className="gap-2 pb-2">
        <Icon name={eventCategoryIcon(key) as never} size={32} color={colors.primary} />
        <Text variant="title">{label}</Text>
        <Text variant="caption">Eventos cadastrados nesta categoria.</Text>
      </View>

      <AsyncContent
        state={state}
        onRetry={reload}
        loadingLabel="Carregando eventos…"
        isEmpty={(events) => events.length === 0}
        empty={
          <Card variant="highlight">
            <EmptyState
              icon="calendar-blank-outline"
              title={`Nenhum evento de ${label} no momento`}
              description="Quando um organizador cadastrar um evento nesta categoria, ele aparece aqui."
            />
          </Card>
        }
      >
        {(events) => (
          <Section
            description={`${events.length} ${events.length === 1 ? 'evento encontrado' : 'eventos encontrados'}`}
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
                  accessibilityLabel={`Abrir o evento ${event.name}`}
                />
              ))}
            </View>
          </Section>
        )}
      </AsyncContent>
    </Screen>
  );
}
