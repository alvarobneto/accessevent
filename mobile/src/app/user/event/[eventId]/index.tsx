import { Stack, router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { AsyncContent } from '@/components/async-content';
import { EventMenu } from '@/components/event-menu';
import { Screen } from '@/components/screen';
import { Section } from '@/components/section';
import { Button, EmptyState, Icon, ListRow, Text } from '@/components/ui';
import { repository } from '@/data';
import { useAsyncData } from '@/hooks/useAsyncData';
import { useRefreshOnFocus } from '@/hooks/useRefreshOnFocus';
import { colors } from '@/theme/tokens';

/**
 * Navegações de um evento, em modo de consulta.
 *
 * A tela é a lista; os dados do evento ficam em `/user/event/[eventId]/details`,
 * atrás do menu de três pontinhos, pelo mesmo combinado do organizador.
 *
 * Recarrega no foco para refletir navegações criadas ou apagadas pelo organizador
 * depois que esta tela foi aberta.
 */
export default function UserEventScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const id = eventId ?? '';

  const event = useAsyncData(() => repository.getEvent(id), id);
  const maps = useAsyncData(() => repository.listNavigationMaps(id), id);

  useRefreshOnFocus((showIndicator) => {
    event.reload(showIndicator);
    maps.reload(showIndicator);
  });

  const eventName = event.state.status === 'success' ? event.state.data?.name : null;

  return (
    <>
      <Stack.Screen
        options={{
          title: eventName ?? 'Evento',
          headerRight: () => (
            <EventMenu eventId={id} eventName={eventName ?? undefined} mode="user" />
          ),
        }}
      />

      <Screen
        scrollable
        onRefresh={() => {
          event.reload();
          maps.reload();
        }}
        refreshing={event.refreshing || maps.refreshing}
        testID="user-event-screen"
      >
        <AsyncContent
          state={event.state}
          onRetry={event.reload}
          loadingLabel="Carregando o evento…"
        >
          {(data) =>
            data ? (
              <>
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
