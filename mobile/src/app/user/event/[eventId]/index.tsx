import { Stack, router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { AsyncContent } from '@/components/async-content';
import { EventDetails } from '@/components/event-details';
import { Screen } from '@/components/screen';
import { Section } from '@/components/section';
import { Button, Card, EmptyState, Icon, ListRow, Text } from '@/components/ui';
import { repository } from '@/data';
import { useAsyncData } from '@/hooks/useAsyncData';
import { colors } from '@/theme/tokens';

/** Navegações de um evento, em modo de consulta. */
export default function UserEventScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const id = eventId ?? '';

  const event = useAsyncData(() => repository.getEvent(id), id);
  const maps = useAsyncData(() => repository.listNavigationMaps(id), id);

  const eventName = event.state.status === 'success' ? event.state.data?.name : null;

  return (
    <>
      <Stack.Screen options={{ title: eventName ?? 'Evento' }} />

      <Screen scrollable testID="user-event-screen">
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
                        title="Nenhuma navegação publicada"
                        description="O organizador ainda não publicou mapas para este evento."
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
                            meta="Mapa do evento"
                            trailing={
                              <Icon name="chevron-right" size={24} color={colors.gray300} />
                            }
                            onPress={() => router.push(`/user/map/${map.id}`)}
                            accessibilityLabel={`Abrir o mapa ${map.name}`}
                          />
                        ))}
                      </View>
                    )}
                  </AsyncContent>
                </Section>

                <Text variant="caption">
                  As informações de acessibilidade são fornecidas pelo organizador e não são
                  verificadas automaticamente pelo aplicativo.
                </Text>
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
