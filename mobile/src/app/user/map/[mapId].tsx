import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { AsyncContent } from '@/components/async-content';
import { EventMap } from '@/components/map';
import { NavigationMenu } from '@/components/navigation-menu';
import { Screen } from '@/components/screen';
import { Alert, Button, Card, EmptyState, Icon, Text } from '@/components/ui';
import { repository } from '@/data';
import type { Area, Path, PointOfInterest } from '@/data/types';
import { useAsyncData } from '@/hooks/useAsyncData';
import { useMapGestureNavigation } from '@/hooks/useMapGestureNavigation';
import { useRefreshOnFocus } from '@/hooks/useRefreshOnFocus';
import { colors } from '@/theme/tokens';
import { markersFromPois, polygonsFromAreas, polylinesFromPaths, rectsFromPois } from '@/utils/mapContent';

const NO_PATHS: readonly Path[] = [];
const NO_POIS: readonly PointOfInterest[] = [];
const NO_AREAS: readonly Area[] = [];

/**
 * Mapa da navegação: a tela é o mapa que o organizador desenhou.
 *
 * O desenho é o `EventMap`, com os caminhos e pontos do organizador. O destino e
 * as restrições de acessibilidade entram nas Sprints 14 a 18. Os dados que o
 * organizador informou sobre a navegação (nome, datas) ficam em
 * `/user/map/[mapId]/details`, atrás do menu de três pontinhos.
 *
 * Recarrega no foco para o título do cabeçalho e os caminhos desenhados refletirem
 * o que o organizador mudou depois que a tela foi aberta.
 */
export default function UserMapScreen() {
  const { mapId } = useLocalSearchParams<{ mapId: string }>();
  const id = mapId ?? '';
  const mapGestures = useMapGestureNavigation();

  const map = useAsyncData(() => repository.getNavigationMap(id), id);
  const savedPaths = useAsyncData(() => repository.listPaths(id), id);
  const savedPois = useAsyncData(() => repository.listPois(id), id);
  const savedAreas = useAsyncData(() => repository.listAreas(id), id);

  const reload = (showIndicator = true) => {
    map.reload(showIndicator);
    savedPaths.reload(showIndicator);
    savedPois.reload(showIndicator);
    savedAreas.reload(showIndicator);
  };

  useRefreshOnFocus(reload);

  const mapName = map.state.status === 'success' ? map.state.data?.name : null;
  const paths = savedPaths.state.status === 'success' ? savedPaths.state.data : NO_PATHS;
  const pois = savedPois.state.status === 'success' ? savedPois.state.data : NO_POIS;
  const areas = savedAreas.state.status === 'success' ? savedAreas.state.data : NO_AREAS;
  const markers = useMemo(() => markersFromPois(pois), [pois]);
  const polylines = useMemo(() => polylinesFromPaths(paths), [paths]);
  const rects = useMemo(() => rectsFromPois(pois), [pois]);
  const isMapContentLoading =
    savedPaths.state.status === 'loading' ||
    savedPois.state.status === 'loading' ||
    savedAreas.state.status === 'loading';
  const mapContentFailed =
    (savedPaths.state.status === 'error' || savedPois.state.status === 'error') &&
    paths.length === 0 &&
    pois.length === 0;
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
          title: mapName ?? 'Mapa',
          headerRight: () => (
            <NavigationMenu mode="user" mapId={id} mapName={mapName ?? undefined} />
          ),
        }}
      />

      <Screen
        scrollable
        onRefresh={() => reload()}
        refreshing={map.refreshing || savedPaths.refreshing || savedPois.refreshing || savedAreas.refreshing}
        testID="user-map-screen"
      >
        <AsyncContent state={map.state} onRetry={reload} loadingLabel="Carregando o mapa…">
          {(data) =>
            data ? (
              <>
                <View className="gap-2">
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
                    ) : mapContentFailed ? (
                      <View className="h-full items-center justify-center rounded-lg border border-border bg-surface p-4">
                        <EmptyState
                          compact
                          icon="alert-circle-outline"
                          title="Não foi possível carregar o mapa"
                          description="Confira sua conexão e tente novamente."
                        >
                          <Button
                            label="Tentar novamente"
                            variant="outline"
                            onPress={() => reload()}
                          />
                        </EmptyState>
                      </View>
                    ) : (
                      <EventMap
                        className="h-full rounded-lg border border-border"
                        markers={markers}
                        polylines={polylines}
                        rects={rects}
                        areas={polygonsFromAreas(areas)}
                        accessibilityLabel={mapAccessibilityLabel}
                        fitPadding={12}
                      />
                    )}
                  </View>
                  <Text variant="caption">
                    Os caminhos registrados pelo organizador e os pontos de interesse aparecem
                    desenhados neste mapa.
                  </Text>
                </View>

                <Alert
                  tone="info"
                  title="Dados informados pelo organizador"
                  description="As características de acessibilidade não são verificadas automaticamente. Confira a data da última atualização antes de seguir por um caminho."
                />

                <Card variant="soft">
                  <View className="gap-2">
                    <View className="flex-row items-center gap-2">
                      <Icon name="human-wheelchair" size={20} color={colors.primary} />
                      <Text variant="label">Rotas dentro do mapa</Text>
                    </View>
                    <Text variant="caption">
                      Em breve você vai escolher um destino e informar suas restrições, como evitar
                      escadas. O aplicativo calcula o caminho dentro do mapa.
                    </Text>
                  </View>
                </Card>

                <Button
                  label="Voltar às navegações"
                  variant="ghost"
                  onPress={() => router.back()}
                />
              </>
            ) : (
              <EmptyState
                icon="map-search-outline"
                title="Mapa não encontrado"
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
