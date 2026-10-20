import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { AsyncContent } from '@/components/async-content';
import { EventMap } from '@/components/map';
import { Screen } from '@/components/screen';
import { Alert, Button, Card, EmptyState, Icon, Text } from '@/components/ui';
import { repository } from '@/data';
import type { Path, PointOfInterest } from '@/data/types';
import { useAsyncData } from '@/hooks/useAsyncData';
import {
  useMapGestureNavigation,
  type MapGestureTouchHandlers,
} from '@/hooks/useMapGestureNavigation';
import { colors } from '@/theme/tokens';
import type { Coordinate } from '@/types/coordinates';
import type { MapGeometry, MapPolyline } from '@/types/map';
import { toErrorMessage } from '@/utils/errors';
import { formatDistance } from '@/utils/format';
import { geometryLengthInMeters } from '@/utils/geo';
import { markersFromPois, polylinesFromPaths, rectsFromPois } from '@/utils/mapContent';
import { pathLabels } from '@/utils/pathLabel';
import { distanceToPathInMeters } from '@/utils/pathGeometry';

/** Tolerância de toque no traçado quando o MapView reporta o toque no fundo. */
const PATH_TAP_TOLERANCE_M = 3;

/**
 * Ajustar rotas direto no mapa: todos os caminhos ficam visíveis e o organizador
 * toca no trajeto que quer corrigir. Não há uma tela intermediária para escolher
 * um caminho; depois de salvar, ele pode tocar em outro e continuar no mesmo mapa.
 */
export default function AdjustPathsScreen() {
  const { mapId } = useLocalSearchParams<{ mapId: string }>();
  const id = mapId ?? '';

  const content = useAsyncData(async () => {
    const [paths, pois] = await Promise.all([repository.listPaths(id), repository.listPois(id)]);
    return { paths, pois };
  }, id);
  const mapGestures = useMapGestureNavigation();

  return (
    <>
      <Stack.Screen
        options={{ ...mapGestures.screenOptions, headerShown: true, title: 'Ajustar rotas' }}
      />

      <Screen contentClassName="flex-1 px-4 py-2" testID="adjust-paths-screen">
        <View className="flex-1">
          <AsyncContent
            state={content.state}
            onRetry={content.reload}
            loadingLabel="Carregando o mapa…"
            isEmpty={({ paths }) => paths.length === 0}
            empty={
              <EmptyState
                icon="vector-polyline"
                title="Nenhum caminho registrado"
                description="Volte à navegação e mapeie um caminho antes de ajustar as rotas."
              >
                <Button label="Voltar ao mapa" variant="outline" onPress={() => router.back()} />
              </EmptyState>
            }
          >
            {({ paths, pois }) => (
              <AdjustPathsEditor
                paths={paths}
                pois={pois}
                mapTouchHandlers={mapGestures.touchHandlers}
              />
            )}
          </AsyncContent>
        </View>
      </Screen>
    </>
  );
}

type AdjustPathsEditorProps = {
  paths: readonly Path[];
  pois: readonly PointOfInterest[];
  mapTouchHandlers: MapGestureTouchHandlers;
};

function AdjustPathsEditor({
  paths: initialPaths,
  pois,
  mapTouchHandlers,
}: AdjustPathsEditorProps) {
  const [paths, setPaths] = useState(initialPaths);
  const [selectedPathId, setSelectedPathId] = useState<string | null>(null);
  // Rascunhos por trajeto permitem alternar entre rotas sem perder ajustes ainda
  // não salvos; cada geometria só é enviada à API pelo botão de salvar.
  const [drafts, setDrafts] = useState<Record<string, MapGeometry>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const selectedPath = paths.find((path) => path.id === selectedPathId) ?? null;
  const draft = selectedPath ? (drafts[selectedPath.id] ?? selectedPath.geometry) : null;
  const dirty = selectedPath !== null && draft !== selectedPath.geometry;
  const changedPaths = paths.flatMap((path) => {
    const geometry = drafts[path.id];
    return geometry && geometry !== path.geometry ? [{ path, geometry }] : [];
  });
  const hasChanges = changedPaths.length > 0;

  const selectPath = useCallback(
    (pathId: string) => {
      if (saving) return;
      setSelectedPathId(pathId);
      setError(null);
      setFeedback(null);
    },
    [saving],
  );

  const clearPathSelection = useCallback(() => {
    if (saving) return;
    setSelectedPathId(null);
    setError(null);
    setFeedback(null);
  }, [saving]);

  const selectPathAtCoordinate = useCallback(
    (coordinate: Coordinate) => {
      let nearestPathId: string | null = null;
      let nearestDistance = PATH_TAP_TOLERANCE_M;

      for (const path of paths) {
        const geometry = drafts[path.id] ?? path.geometry;
        const distance = distanceToPathInMeters(coordinate, geometry);
        if (distance < nearestDistance) {
          nearestPathId = path.id;
          nearestDistance = distance;
        }
      }

      if (nearestPathId) selectPath(nearestPathId);
      else clearPathSelection();
    },
    [paths, drafts, selectPath, clearPathSelection],
  );

  const applyDraft = useCallback(
    (geometry: MapGeometry) => {
      if (!selectedPathId) return;
      setDrafts((current) => ({ ...current, [selectedPathId]: geometry }));
      setError(null);
      setFeedback(null);
    },
    [selectedPathId],
  );

  const polylines = useMemo<MapPolyline[]>(
    () =>
      polylinesFromPaths(paths).map((polyline) => {
        const isSelected = polyline.id === selectedPathId;

        return {
          ...polyline,
          // Todos os rascunhos continuam visíveis ao trocar a rota selecionada.
          geometry: drafts[polyline.id] ?? polyline.geometry,
          tone: isSelected ? 'highlight' : 'default',
          onPress: () => selectPath(polyline.id),
          ...(isSelected
            ? {
                editable: true,
                onPreview: applyDraft,
                onCommit: applyDraft,
              }
            : {}),
        };
      }),
    [paths, selectedPathId, drafts, selectPath, applyDraft],
  );

  const markers = useMemo(() => markersFromPois(pois), [pois]);
  const rects = useMemo(() => rectsFromPois(pois), [pois]);

  const handleSave = async () => {
    if (!hasChanges || saving) return;

    setSaving(true);
    setError(null);
    setFeedback(null);

    try {
      const results = await Promise.allSettled(
        changedPaths.map(({ path, geometry }) => repository.replacePathGeometry(path.id, geometry)),
      );
      const savedEntries = results.flatMap((result, index) =>
        result.status === 'fulfilled'
          ? [{ ...changedPaths[index]!, updatedPath: result.value }]
          : [],
      );
      const failedResult = results.find((result) => result.status === 'rejected');

      setPaths((current) =>
        current.map(
          (path) =>
            savedEntries.find(({ updatedPath }) => updatedPath.id === path.id)?.updatedPath ?? path,
        ),
      );
      setDrafts((current) => {
        const next = { ...current };
        for (const { path, geometry } of savedEntries) {
          if (next[path.id] === geometry) delete next[path.id];
        }
        return next;
      });
      if (failedResult?.status === 'rejected') {
        const partialSave =
          savedEntries.length > 0
            ? ` ${savedEntries.length} de ${changedPaths.length} rotas foram salvas; as demais continuam pendentes.`
            : '';
        setError(
          `${toErrorMessage(failedResult.reason, 'Não foi possível salvar todas as rotas.')}${partialSave}`,
        );
      } else {
        setFeedback(
          savedEntries.length === 1
            ? 'Ajuste salvo para 1 rota.'
            : `Ajustes salvos para ${savedEntries.length} rotas.`,
        );
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    if (!selectedPath) return;
    setDrafts((current) => {
      const next = { ...current };
      delete next[selectedPath.id];
      return next;
    });
    setError(null);
    setFeedback(null);
  };

  const labels = selectedPath ? pathLabels(selectedPath) : null;

  return (
    <>
      <ScrollView
        horizontal
        className="max-h-12 flex-none"
        showsHorizontalScrollIndicator={false}
        accessibilityLabel="Caminhos disponíveis para ajuste. Deslize na horizontal para ver todos."
      >
        <View className="flex-row items-center gap-2 pr-4">
          <View className="justify-center pr-1">
            <Text variant="caption" className="font-semibold">
              Rotas
            </Text>
            <Text variant="caption" tint="muted">
              {paths.length}
            </Text>
          </View>
          {paths.map((path) => (
            <PathOption
              key={path.id}
              path={path}
              selected={path.id === selectedPathId}
              hasPendingChanges={Boolean(drafts[path.id])}
              onPress={() => selectPath(path.id)}
            />
          ))}
        </View>
      </ScrollView>

      <View className="min-h-0 flex-1" {...mapTouchHandlers}>
        <EventMap
          className="flex-1 rounded-xl border border-border"
          polylines={polylines}
          markers={markers}
          rects={rects}
          onMapPress={selectPathAtCoordinate}
          accessibilityLabel={
            selectedPath && labels
              ? `Mapa com ${paths.length} caminhos. ${labels.title} está selecionado para ajuste.`
              : `Mapa com ${paths.length} caminhos. Toque em um trajeto para ajustá-lo.`
          }
          testID="adjust-paths-map"
        />
      </View>

      <View className="gap-2 pt-1">
        {feedback ? <Alert tone="success" title="Ajuste salvo" description={feedback} /> : null}
        {error ? <Alert tone="error" title="Não foi possível salvar" description={error} /> : null}

        {selectedPath && labels && draft ? (
          <Card
            variant={dirty ? 'highlight' : 'outline'}
            className="gap-2 p-2"
            title={labels.title}
            subtitle={`${formatDistance(geometryLengthInMeters(draft))} · ${dirty ? 'Alterações não salvas' : 'Sem alterações'}`}
            trailing={<Icon name="vector-polyline" size={24} color={colors.primary} />}
          >
            <View className="flex-row items-center gap-2">
              <Text variant="caption" className="flex-1">
                Arraste as alças para ajustar o traçado.
              </Text>
              {dirty ? (
                <Button
                  label="Descartar"
                  variant="outline"
                  size="md"
                  iconStart={<Icon name="undo" size={20} color={colors.content} />}
                  disabled={saving}
                  onPress={handleDiscard}
                  testID="discard-path-adjust"
                />
              ) : null}
            </View>
          </Card>
        ) : null}

        <Button
          label="Salvar ajustes"
          loading={saving}
          loadingLabel="Salvando…"
          disabled={!hasChanges || saving}
          iconStart={<Icon name="check" size={20} color={colors.white} />}
          onPress={() => void handleSave()}
          fullWidth
          testID="save-path-adjust"
        />
      </View>
    </>
  );
}

type PathOptionProps = {
  path: Path;
  selected: boolean;
  hasPendingChanges: boolean;
  onPress: () => void;
};

function PathOption({ path, selected, hasPendingChanges, onPress }: PathOptionProps) {
  const labels = pathLabels(path);
  const distance = formatDistance(geometryLengthInMeters(path.geometry));

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${selected ? 'Selecionado. ' : ''}${labels.title}, ${distance}${hasPendingChanges ? ', alterações não salvas' : ''}`}
      accessibilityHint="Seleciona este caminho para ajustar os pontos no mapa."
      accessibilityState={{ selected }}
      testID={`select-path-${path.id}`}
      className={`min-h-12 w-36 flex-row items-center gap-2 rounded-lg border px-2 py-1 active:opacity-70 ${selected ? 'border-primary bg-primary-50' : 'border-border bg-background'}`}
    >
      <View className="flex-1 gap-0">
        <Text variant="caption" numberOfLines={1} className="font-semibold">
          {labels.title}
        </Text>
        <Text variant="caption" tint={hasPendingChanges ? 'warning' : 'muted'} numberOfLines={1}>
          {hasPendingChanges ? 'Alterações pendentes' : distance}
        </Text>
      </View>
      {selected ? <Icon name="check-circle-outline" size={20} color={colors.primary} /> : null}
    </Pressable>
  );
}
