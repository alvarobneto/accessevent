import { Stack, router, useLocalSearchParams } from 'expo-router';

import { AsyncContent } from '@/components/async-content';
import { PoiForm } from '@/components/poi-form';
import { Screen } from '@/components/screen';
import { Button, EmptyState } from '@/components/ui';
import { repository } from '@/data';
import { useAsyncData } from '@/hooks/useAsyncData';
import { useMapGestureNavigation } from '@/hooks/useMapGestureNavigation';
import { markersFromPois, polylinesFromPaths } from '@/utils/mapContent';

/**
 * Editar ponto de interesse: tipo, posição, nome opcional e a ação de apagar.
 *
 * Os outros pontos e os caminhos ficam no desenho junto com o ponto em edição,
 * porque a posição se escolhe em relação ao que já foi mapeado.
 */
export default function EditPoiScreen() {
  const { mapId, poiId } = useLocalSearchParams<{ mapId: string; poiId: string }>();
  const id = poiId ?? '';
  const map = mapId ?? '';
  const mapGestures = useMapGestureNavigation();

  const poi = useAsyncData(async () => {
    const [point, pois, paths] = await Promise.all([
      repository.getPoi(id),
      repository.listPois(map),
      repository.listPaths(map),
    ]);

    return {
      point,
      markers: markersFromPois(pois),
      polylines: polylinesFromPaths(paths),
    };
  }, `${map}:${id}`);

  return (
    <>
      <Stack.Screen
        options={{ ...mapGestures.screenOptions, title: 'Editar ponto de interesse' }}
      />
      <Screen scrollable testID="edit-poi-screen">
        <AsyncContent state={poi.state} onRetry={poi.reload} loadingLabel="Carregando o ponto…">
          {(data) => {
            const point = data.point;

            if (!point) {
              return (
                <EmptyState
                  icon="map-search-outline"
                  title="Ponto não encontrado"
                  description="Ele pode ter sido removido desde que esta tela foi aberta."
                >
                  <Button label="Voltar" variant="outline" onPress={() => router.back()} />
                </EmptyState>
              );
            }

            return (
              <PoiForm
                poi={point}
                contextMarkers={data.markers}
                contextPolylines={data.polylines}
                submitLabel="Salvar alterações"
                submitLoadingLabel="Salvando o ponto…"
                mapTouchHandlers={mapGestures.touchHandlers}
                onSubmit={async (values) => {
                  await repository.updatePoi(point.id, values);
                  // `back()` devolve para o hub da navegação, que recarrega os
                  // pontos quando volta a ficar em foco.
                  router.back();
                }}
                onDelete={(target) => repository.deletePoi(target.id)}
              />
            );
          }}
        </AsyncContent>
      </Screen>
    </>
  );
}
