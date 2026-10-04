import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { View } from 'react-native';

import { AsyncContent } from '@/components/async-content';
import { EventMap } from '@/components/map';
import { NavigationMenu } from '@/components/navigation-menu';
import { NoPathsHint, PathList } from '@/components/path-list';
import { Screen } from '@/components/screen';
import { Section } from '@/components/section';
import { Badge, Button, Card, EmptyState, Icon, Text } from '@/components/ui';
import { repository } from '@/data';
import type { Path } from '@/data/types';
import { useAsyncData } from '@/hooks/useAsyncData';
import { useRefreshOnFocus } from '@/hooks/useRefreshOnFocus';
import { colors } from '@/theme/tokens';
import { polylinesFromPaths } from '@/utils/mapContent';

/**
 * Lista vazia com identidade estável.
 *
 * O `EventMap` reenquadra a câmera quando o conteúdo muda, e um array novo a cada
 * render com o mesmo conteúdo faria a tela recomputar as polilinhas sem parar. Com
 * uma constante, o `useMemo` abaixo só depende do conteúdo de verdade.
 */
const NO_PATHS: readonly Path[] = [];

/**
 * Gerenciar Navegação: o mapa e o que ainda vai existir nele.
 *
 * É o destino do item da lista de navegações do evento, e o editor fica a um
 * toque de distância pelo menu de três pontinhos — o mesmo combinado do evento: o
 * item da lista abre a coisa, o menu é quem edita. Pelo mesmo motivo os dados da
 * navegação (nome, datas) não aparecem aqui: eles têm tela própria, atrás de
 * "Ver detalhes".
 *
 * Esta tela é o **hub** do mapa: mostra os caminhos já gravados sobre o mapa e é
 * de onde sai a gravação. A gravação mora em `/record` (PRD §9.2) porque é uma
 * tarefa com início, acompanhamento e fim — emaranhada aqui, ela empurraria para
 * baixo a lista de caminhos, que é o que a tela tem que mostrar.
 *
 * Navegação e caminhos são carregados separados: a lista falhar não pode apagar o
 * mapa da tela, e o `useRefreshOnFocus` recarrega os dois quando a pessoa volta da
 * gravação — o caminho salvo em `/record` precisa aparecer aqui sem exigir uma ida
 * até a tela de escolha de modo.
 *
 * O desenho é o `EventMap` da Sprint 3; os pontos de interesse entram na Sprint 7.
 */
export default function ManageNavigationMapScreen() {
  const { eventId, mapId } = useLocalSearchParams<{ eventId: string; mapId: string }>();
  const id = mapId ?? '';

  const map = useAsyncData(() => repository.getNavigationMap(id), id);
  const savedPaths = useAsyncData(() => repository.listPaths(id), id);

  useRefreshOnFocus(() => {
    map.reload();
    savedPaths.reload();
  });

  const navigationName = map.state.status === 'success' ? map.state.data?.name : null;

  const paths = savedPaths.state.status === 'success' ? savedPaths.state.data : NO_PATHS;

  const polylines = useMemo(() => polylinesFromPaths(paths), [paths]);

  return (
    <>
      <Stack.Screen
        options={{
          title: navigationName ?? 'Navegação',
          headerRight: () => (
            <NavigationMenu eventId={eventId} mapId={id} mapName={navigationName ?? undefined} />
          ),
        }}
      />

      <Screen scrollable testID="manage-navigation-map-screen">
        <AsyncContent state={map.state} onRetry={map.reload} loadingLabel="Carregando a navegação…">
          {(data) =>
            data ? (
              <>
                <View className="gap-3">
                  <EventMap
                    className="h-72 rounded-lg border border-border"
                    polylines={polylines}
                    accessibilityLabel={
                      paths.length > 0
                        ? `Mapa da navegação com ${paths.length} ${
                            paths.length === 1 ? 'caminho registrado' : 'caminhos registrados'
                          }`
                        : 'Mapa da navegação'
                    }
                  />
                  <Text variant="caption">
                    O mapa é desenhado a partir dos caminhos que você percorre no local.
                  </Text>
                </View>

                <Button
                  label="Mapear novo caminho"
                  iconStart={<Icon name="map-marker-path" size={20} color={colors.white} />}
                  onPress={() =>
                    router.push({
                      pathname: '/organizer/event/[eventId]/map/[mapId]/record',
                      params: { eventId, mapId: id },
                    })
                  }
                  fullWidth
                />

                <AsyncContent
                  state={savedPaths.state}
                  onRetry={savedPaths.reload}
                  loadingLabel="Carregando os caminhos…"
                  isEmpty={(list) => list.length === 0}
                  empty={<NoPathsHint />}
                >
                  {(list) => <PathList paths={list} onChanged={savedPaths.reload} />}
                </AsyncContent>

                <Section
                  title="O que vem a seguir"
                  description="A navegação pode ser renomeada a qualquer momento pelo menu acima."
                >
                  <Card variant="soft">
                    <UpcomingItem
                      icon="map-marker-multiple-outline"
                      title="Pontos de interesse"
                      description="Entradas, banheiros, elevadores, escadas e balcões de informação."
                    />
                    <UpcomingItem
                      icon="wheelchair-accessibility"
                      title="Acessibilidade dos caminhos"
                      description="Largura, rampa e presença de escadas em cada caminho registrado."
                    />
                  </Card>
                </Section>

                <Button
                  label="Voltar ao evento"
                  variant="ghost"
                  onPress={() => router.push(`/organizer/event/${eventId}`)}
                />
              </>
            ) : (
              <EmptyState
                icon="map-search-outline"
                title="Navegação não encontrada"
                description="Ela pode ter sido removida desde que esta tela foi aberta."
              />
            )
          }
        </AsyncContent>
      </Screen>
    </>
  );
}

type UpcomingItemProps = {
  icon: 'map-marker-multiple-outline' | 'wheelchair-accessibility';
  title: string;
  description: string;
};

function UpcomingItem({ icon, title, description }: UpcomingItemProps) {
  return (
    <View className="flex-row items-start gap-3">
      <View className="size-10 items-center justify-center rounded-md bg-background">
        <Icon name={icon} size={20} color={colors.gray500} />
      </View>
      <View className="flex-1 gap-1">
        <View className="flex-row items-center gap-2">
          <Text variant="label">{title}</Text>
          <Badge label="Em breve" />
        </View>
        <Text variant="caption">{description}</Text>
      </View>
    </View>
  );
}
