import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { AsyncContent } from '@/components/async-content';
import { EventMap } from '@/components/map';
import { NavigationMenu } from '@/components/navigation-menu';
import { NoPathsHint, PathList } from '@/components/path-list';
import { NoPoisHint, PoiList } from '@/components/poi-list';
import { Screen } from '@/components/screen';
import { Section } from '@/components/section';
import { Badge, Button, Card, EmptyState, Icon, Text } from '@/components/ui';
import { repository } from '@/data';
import type { Area, Path, PointOfInterest } from '@/data/types';
import { useAsyncData } from '@/hooks/useAsyncData';
import { useMapGestureNavigation } from '@/hooks/useMapGestureNavigation';
import { useRefreshOnFocus } from '@/hooks/useRefreshOnFocus';
import { colors } from '@/theme/tokens';
import { markersFromPois, polygonsFromAreas, polylinesFromPaths } from '@/utils/mapContent';

/**
 * Listas vazias com identidade estável.
 *
 * O `EventMap` reenquadra a câmera quando o conteúdo muda, e um array novo a cada
 * render com o mesmo conteúdo faria a tela recomputar as polilinhas sem parar. Com
 * uma constante, o `useMemo` abaixo só depende do conteúdo de verdade.
 */
const NO_PATHS: readonly Path[] = [];
const NO_POIS: readonly PointOfInterest[] = [];
const NO_AREAS: readonly Area[] = [];

/**
 * Gerenciar Navegação: o mapa e o que já existe nele (modo consulta).
 *
 * É o destino do item da lista de navegações do evento, e o editor fica a um
 * toque de distância pelo menu de três pontinhos — o mesmo combinado do evento: o
 * item da lista abre a coisa, o menu é quem edita. Pelo mesmo motivo os dados da
 * navegação (nome, datas) não aparecem aqui: eles têm tela própria, atrás de
 * "Ver detalhes".
 *
 * Esta tela é o **hub** do mapa, e virou consulta: mostra o desenho e as listas,
 * e as portas de edição da navegação (renomear, ajustar trajeto, gravar caminho,
 * marcar ponto) saíram para `/edit` — é o botão "Editar a navegação" que leva
 * lá. Três botões de ação no meio do mapa competiam com o próprio mapa; quem já
 * veio editar faz um toque a mais e ganha uma tela com um trabalho só.
 *
 * As **listas continuam aqui** com toque e apagar: a linha da lista é a porta
 * com alvo de toque grande e nome legível (ver `PathList`/`PoiList`), e apagar é
 * ação do corpo da tela, não do editor.
 *
 * Navegação, caminhos e pontos são carregados separados: a lista falhar não pode
 * apagar o mapa da tela, e o `useRefreshOnFocus` recarrega as três quando a pessoa
 * volta da gravação ou do editor de ponto — o que foi salvo precisa aparecer aqui
 * sem exigir uma ida até a tela de escolha de modo.
 *
 * O desenho é o `EventMap` da Sprint 3, com os pontos de interesse da Sprint 7
 * como marcadores e os caminhos como trajetos. Ambos abrem o editor pelo toque no
 * desenho, e ambos também têm linha na lista.
 */
export default function ManageNavigationMapScreen() {
  const { eventId, mapId } = useLocalSearchParams<{ eventId: string; mapId: string }>();
  const id = mapId ?? '';
  const mapGestures = useMapGestureNavigation();

  const map = useAsyncData(() => repository.getNavigationMap(id), id);
  const savedPaths = useAsyncData(() => repository.listPaths(id), id);
  const savedPois = useAsyncData(() => repository.listPois(id), id);
  const savedAreas = useAsyncData(() => repository.listAreas(id), id);

  useRefreshOnFocus((showIndicator) => {
    map.reload(showIndicator);
    savedPaths.reload(showIndicator);
    savedPois.reload(showIndicator);
    savedAreas.reload(showIndicator);
  });

  const navigationName = map.state.status === 'success' ? map.state.data?.name : null;

  const paths = savedPaths.state.status === 'success' ? savedPaths.state.data : NO_PATHS;
  const pois = savedPois.state.status === 'success' ? savedPois.state.data : NO_POIS;
  const areas = savedAreas.state.status === 'success' ? savedAreas.state.data : NO_AREAS;
  // Não montar a câmera sem os dados que localizam o mapa: `initialRegion` vale
  // só na montagem, e o centro de fallback não representa o local do evento.
  const isMapContentLoading =
    savedPaths.state.status === 'loading' ||
    savedPois.state.status === 'loading' ||
    savedAreas.state.status === 'loading';

  const openPathEditor = useCallback(
    (pathId: string) => {
      router.push({
        pathname: '/organizer/event/[eventId]/map/[mapId]/path/[pathId]',
        params: { eventId, mapId: id, pathId },
      });
    },
    [eventId, id],
  );

  const openPoiEditor = useCallback(
    (poiId: string) => {
      router.push({
        pathname: '/organizer/event/[eventId]/map/[mapId]/poi/[poiId]',
        params: { eventId, mapId: id, poiId },
      });
    },
    [eventId, id],
  );

  // O trajeto é uma das duas formas de escolher um caminho — a outra é a linha da
  // lista, que é a que tem alvo de toque grande e nome legível. O `onPress` mora
  // em cada polilinha porque o evento do `react-native-maps` só traz o `id` no
  // Google Maps do iOS; ver `MapPolyline`.
  const polylines = useMemo(
    () =>
      polylinesFromPaths(paths).map((polyline) => ({
        ...polyline,
        onPress: () => openPathEditor(polyline.id),
      })),
    [paths, openPathEditor],
  );

  // O marcador é a mesma segunda porta do trajeto: tocar no pino abre o editor do
  // ponto. O `tone` fica no padrão — ver `MapMarker`.
  const markers = useMemo(
    () =>
      markersFromPois(pois).map((marker) => ({
        ...marker,
        onPress: () => openPoiEditor(marker.id),
      })),
    [pois, openPoiEditor],
  );

  const mapAccessibilityLabel = [
    'Mapa da navegação',
    paths.length > 0
      ? `${paths.length} ${paths.length === 1 ? 'caminho registrado' : 'caminhos registrados'}`
      : null,
    pois.length > 0
      ? `${pois.length} ${pois.length === 1 ? 'ponto de interesse' : 'pontos de interesse'}`
      : null,
    areas.length > 0 ? `${areas.length} ${areas.length === 1 ? 'área' : 'áreas'}` : null,
  ]
    .filter((part) => part !== null)
    .join(' com ');

  return (
    <>
      <Stack.Screen
        options={{
          ...mapGestures.screenOptions,
          headerShown: true,
          title: navigationName ?? 'Navegação',
          headerRight: () => (
            <NavigationMenu eventId={eventId} mapId={id} mapName={navigationName ?? undefined} />
          ),
        }}
      />

      <Screen
        scrollable
        onRefresh={() => {
          map.reload();
          savedPaths.reload();
          savedPois.reload();
          savedAreas.reload();
        }}
        refreshing={map.refreshing || savedPaths.refreshing || savedPois.refreshing || savedAreas.refreshing}
        testID="manage-navigation-map-screen"
      >
        <AsyncContent state={map.state} onRetry={map.reload} loadingLabel="Carregando a navegação…">
          {(data) =>
            data ? (
              <>
                <View className="gap-3">
                  <View className="h-72" {...mapGestures.touchHandlers}>
                    {isMapContentLoading ? (
                      <View
                        className="h-full items-center justify-center gap-2 rounded-lg border border-border bg-surface"
                        accessibilityLabel="Carregando o mapa"
                        accessibilityLiveRegion="polite"
                      >
                        <ActivityIndicator color={colors.primary} />
                        <Text variant="caption" tint="muted">
                          Carregando o mapa…
                        </Text>
                      </View>
                    ) : (
                      <EventMap
                        className="h-full rounded-lg border border-border"
                        markers={markers}
                        polylines={polylines}
                        areas={polygonsFromAreas(areas)}
                        accessibilityLabel={mapAccessibilityLabel}
                        fitPadding={12}
                      />
                    )}
                  </View>
                  <Text variant="caption">
                    O mapa é desenhado a partir dos caminhos que você percorre no local. Toque em um
                    trajeto ou em um ponto para abri-lo.
                  </Text>
                </View>

                <Button
                  label="Editar a navegação"
                  iconStart={<Icon name="pencil" size={20} color={colors.white} />}
                  onPress={() =>
                    router.push({
                      pathname: '/organizer/event/[eventId]/map/[mapId]/edit',
                      params: { eventId, mapId: id },
                    })
                  }
                  fullWidth
                  testID="edit-navigation"
                />

                <AsyncContent
                  state={savedPois.state}
                  onRetry={savedPois.reload}
                  loadingLabel="Carregando os pontos…"
                  isEmpty={(list) => list.length === 0}
                  empty={<NoPoisHint />}
                >
                  {(list) => (
                    <PoiList pois={list} onOpen={openPoiEditor} onChanged={savedPois.reload} />
                  )}
                </AsyncContent>

                <AsyncContent
                  state={savedPaths.state}
                  onRetry={savedPaths.reload}
                  loadingLabel="Carregando os caminhos…"
                  isEmpty={(list) => list.length === 0}
                  empty={<NoPathsHint />}
                >
                  {(list) => (
                    <PathList paths={list} onOpen={openPathEditor} onChanged={savedPaths.reload} />
                  )}
                </AsyncContent>

                <Section
                  title="O que vem a seguir"
                  description="Renomear, ajustar trajetos e cadastrar pontos ficam em “Editar a navegação”."
                >
                  <Card variant="soft">
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
  icon: 'wheelchair-accessibility';
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
