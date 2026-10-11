import { Stack, router, useLocalSearchParams } from 'expo-router';

import { AsyncContent } from '@/components/async-content';
import { PoiForm } from '@/components/poi-form';
import { Screen } from '@/components/screen';
import { repository } from '@/data';
import { useAsyncData } from '@/hooks/useAsyncData';
import { useMapGestureNavigation } from '@/hooks/useMapGestureNavigation';
import { markersFromPois, polylinesFromPaths } from '@/utils/mapContent';

/**
 * Criar ponto de interesse. O formulário posiciona a marcação no mapa e grava
 * somente `rect` + `anchor`; a posição absoluta é derivada pelo backend.
 */
export default function NewPoiScreen() {
  const { mapId } = useLocalSearchParams<{ eventId: string; mapId: string }>();
  const id = mapId ?? '';
  const mapGestures = useMapGestureNavigation();

  const context = useAsyncData(async () => {
    const [pois, paths] = await Promise.all([repository.listPois(id), repository.listPaths(id)]);
    return {
      markers: markersFromPois(pois),
      polylines: polylinesFromPaths(paths),
    };
  }, id);

  return (
    <>
      <Stack.Screen
        options={{ ...mapGestures.screenOptions, title: 'Adicionar ponto de interesse' }}
      />

      <Screen scrollable testID="new-poi-screen">
        <AsyncContent
          state={context.state}
          onRetry={context.reload}
          loadingLabel="Carregando o mapa…"
        >
          {(data) => (
            <PoiForm
              contextMarkers={data.markers}
              contextPolylines={data.polylines}
              submitLabel="Salvar ponto"
              submitLoadingLabel="Salvando o ponto…"
              mapTouchHandlers={mapGestures.touchHandlers}
              onSubmit={async (values) => {
                await repository.createPoi({ mapId: id, ...values });
                router.back();
              }}
            />
          )}
        </AsyncContent>
      </Screen>
    </>
  );
}
