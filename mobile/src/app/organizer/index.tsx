import { router } from 'expo-router';
import { View } from 'react-native';

import { AsyncContent } from '@/components/async-content';
import { Screen } from '@/components/screen';
import { Section } from '@/components/section';
import { Button, Card, Icon, ListRow, Text } from '@/components/ui';
import { repository } from '@/data';
import { useAsyncData } from '@/hooks/useAsyncData';
import { colors } from '@/theme/tokens';

/** Área do organizador: os eventos cadastrados e o atalho para criar um novo. */
export default function OrganizerEventsScreen() {
  const { state, reload } = useAsyncData(() => repository.listEvents());

  return (
    <Screen scrollable testID="organizer-events-screen">
      <AsyncContent
        state={state}
        onRetry={reload}
        loadingLabel="Carregando eventos…"
        isEmpty={(events) => events.length === 0}
        empty={
          <Card variant="highlight">
            <View className="gap-1">
              <Text variant="heading">Comece pelo evento</Text>
              <Text variant="caption">
                Crie o evento e depois monte as navegações — um mapa para cada andar, bloco ou área
                externa.
              </Text>
            </View>
            <Button
              label="Criar evento"
              iconStart={<Icon name="plus" size={20} color={colors.background} />}
              onPress={() => router.push('/organizer/event/new')}
              testID="open-create-event"
            />
          </Card>
        }
      >
        {(events) => (
          <View className="gap-6">
            <Button
              label="Criar evento"
              iconStart={<Icon name="plus" size={20} color={colors.background} />}
              onPress={() => router.push('/organizer/event/new')}
              testID="open-create-event"
            />

            <Section
              description={`${events.length} ${events.length === 1 ? 'evento cadastrado' : 'eventos cadastrados'}`}
            >
              <View className="gap-4">
                {events.map((event) => (
                  <ListRow
                    key={event.id}
                    icon={<Icon name="calendar-blank-outline" size={24} color={colors.primary} />}
                    title={event.name}
                    description={event.description ?? undefined}
                    trailing={<Icon name="chevron-right" size={24} color={colors.gray300} />}
                    onPress={() => router.push(`/organizer/event/${event.id}`)}
                    accessibilityLabel={`Gerenciar o evento ${event.name}`}
                  />
                ))}
              </View>
            </Section>
          </View>
        )}
      </AsyncContent>
    </Screen>
  );
}
