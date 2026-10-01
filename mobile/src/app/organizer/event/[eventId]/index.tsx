import { Stack, router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { AsyncContent } from '@/components/async-content';
import { EventDetails } from '@/components/event-details';
import { Screen } from '@/components/screen';
import { Section } from '@/components/section';
import { Button, Card, EmptyState, Icon, ListRow, Text } from '@/components/ui';
import { repository } from '@/data';
import { useAsyncData } from '@/hooks/useAsyncData';
import { useRefreshOnFocus } from '@/hooks/useRefreshOnFocus';
import { colors } from '@/theme/tokens';
import { formatDate } from '@/utils/format';

/** Gerenciar Evento: criar navegações e abrir o editor de cada uma. */
export default function ManageEventScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const id = eventId ?? '';

  const event = useAsyncData(() => repository.getEvent(id), id);
  const maps = useAsyncData(() => repository.listNavigationMaps(id), id);

  useRefreshOnFocus(() => {
    event.reload();
    maps.reload();
  });

  const eventName = event.state.status === 'success' ? event.state.data?.name : null;

  return (
    <>
      <Stack.Screen options={{ title: eventName ?? 'Evento' }} />

      <Screen scrollable testID="manage-event-screen">
        <AsyncContent
          state={event.state}
          onRetry={event.reload}
          loadingLabel="Carregando o evento…"
        >
          {(data) =>
            data ? (
              <>
                <Card>
                  <EventDetails event={data} />

                  <Button
                    label="Editar dados do evento"
                    variant="outline"
                    size="md"
                    iconStart={<Icon name="pencil-outline" size={20} color={colors.primary} />}
                    onPress={() => router.push(`/organizer/event/${id}/edit`)}
                    testID="open-edit-event"
                  />
                </Card>

                <Card variant="highlight">
                  <View className="gap-1">
                    <Text variant="heading">Nova navegação</Text>
                    <Text variant="caption">
                      Um mapa independente dentro do evento: um andar, um bloco ou a área externa.
                    </Text>
                  </View>
                  <Button
                    label="Criar navegação"
                    iconStart={<Icon name="plus" size={20} color={colors.background} />}
                    onPress={() => router.push(`/organizer/event/${id}/map/new`)}
                    testID="open-create-map"
                  />
                </Card>

                <Section
                  title="Navegações"
                  description={
                    maps.state.status === 'success'
                      ? `${maps.state.data.length} ${maps.state.data.length === 1 ? 'mapa' : 'mapas'}`
                      : undefined
                  }
                >
                  <AsyncContent
                    state={maps.state}
                    onRetry={maps.reload}
                    loadingLabel="Carregando as navegações…"
                    isEmpty={(items) => items.length === 0}
                    empty={
                      <EmptyState
                        icon="vector-polygon"
                        title="Nenhuma navegação ainda"
                        description="Crie a primeira navegação para começar a mapear o espaço."
                      />
                    }
                  >
                    {(items) => (
                      <View className="gap-4">
                        {items.map((map) => (
                          <ListRow
                            key={map.id}
                            icon={<Icon name="vector-polygon" size={24} color={colors.primary} />}
                            title={map.name}
                            meta={`Atualizada em ${formatDate(map.updatedAt)}`}
                            trailing={
                              <Icon name="pencil-outline" size={20} color={colors.primary} />
                            }
                            onPress={() => router.push(`/organizer/map/${map.id}`)}
                            accessibilityLabel={`Editar a navegação ${map.name}`}
                          />
                        ))}
                      </View>
                    )}
                  </AsyncContent>
                </Section>
              </>
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
