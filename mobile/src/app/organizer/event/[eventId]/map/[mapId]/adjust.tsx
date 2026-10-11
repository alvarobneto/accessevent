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
import { useMapGestureNavigation, type MapGestureTouchHandlers } from '@/hooks/useMapGestureNavigation';
import { colors } from '@/theme/tokens';
import type { MapGeometry, MapPolyline } from '@/types/map';
import { toErrorMessage } from '@/utils/errors';
import { formatDistance } from '@/utils/format';
import { geometryLengthInMeters } from '@/utils/geo';
import { markersFromPois, polylinesFromPaths, rectsFromPois } from '@/utils/mapContent';
import { pathLabels } from '@/utils/pathLabel';

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
        options={{ ...mapGestures.screenOptions, headerShown: true, title: 'Ajustar rota' }}
      />

      <Screen
        scrollable
        contentClassName="flex-grow gap-3 px-4 pb-4 pt-3"
        testID="adjust-paths-screen"
      >
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
      </Screen>
    </>
  );
}

type AdjustPathsEditorProps = {
  paths: readonly Path[];
  pois: readonly PointOfInterest[];
  mapTouchHandlers: MapGestureTouchHandlers;
};

function AdjustPathsEditor({ paths: initialPaths, pois, mapTouchHandlers }: AdjustPathsEditorProps) {
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

  const selectPath = useCallback(
    (pathId: string) => {
      if (saving) return;
      setSelectedPathId(pathId);
      setError(null);
      setFeedback(null);
    },
    [saving],
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
          geometry: isSelected ? (drafts[polyline.id] ?? polyline.geometry) : polyline.geometry,
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
    if (!selectedPath || !draft || !dirty) return;

    setSaving(true);
    setError(null);
    setFeedback(null);

    try {
      const updated = await repository.replacePathGeometry(selectedPath.id, draft);
      setPaths((current) => current.map((path) => (path.id === updated.id ? updated : path)));
      setDrafts((current) => {
        const next = { ...current };
        delete next[updated.id];
        return next;
      });
      setFeedback(`Ajuste de “${pathLabels(updated).title}” salvo.`);
    } catch (saveError) {
      setError(toErrorMessage(saveError, 'Não foi possível salvar o ajuste do trajeto.'));
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
      <View className="gap-1">
        <View className="flex-row items-center justify-between gap-2">
          <Text variant="label">1. Escolha um caminho</Text>
          <Text variant="caption" tint="muted">
            {paths.length} {paths.length === 1 ? 'caminho' : 'caminhos'}
          </Text>
        </View>
        <Text variant="caption" tint="muted">
          Selecione uma opção ou toque no traçado do mapa.
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        accessibilityLabel="Caminhos disponíveis para ajuste. Deslize na horizontal para ver todos."
      >
        <View className="flex-row gap-2 py-1 pr-5">
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

      <Text variant="label">2. Ajuste os pontos no mapa</Text>
      <View className="min-h-56 flex-1" {...mapTouchHandlers}>
        <EventMap
          className="h-full rounded-xl border border-border"
          polylines={polylines}
          markers={markers}
          rects={rects}
          accessibilityLabel={
            selectedPath && labels
              ? `Mapa com ${paths.length} caminhos. ${labels.title} está selecionado para ajuste.`
              : `Mapa com ${paths.length} caminhos. Toque em um trajeto para ajustá-lo.`
          }
          testID="adjust-paths-map"
        />
      </View>

      <View className="gap-4">
        {feedback ? <Alert tone="success" title="Ajuste salvo" description={feedback} /> : null}
        {error ? <Alert tone="error" title="Não foi possível salvar" description={error} /> : null}

        {selectedPath && labels && draft ? (
          <Card
            variant={dirty ? 'highlight' : 'outline'}
            className="gap-3 p-3"
            title={labels.title}
            subtitle={`${formatDistance(geometryLengthInMeters(draft))} · ${dirty ? 'Alterações não salvas' : 'Sem alterações'}`}
            trailing={<Icon name="vector-polyline" size={24} color={colors.primary} />}
          >
            <Text variant="caption">
              Arraste os pontos azuis para corrigir o traçado. Para mudar de caminho, escolha outra
              opção acima.
            </Text>
            <View className="flex-row gap-2">
              {dirty ? (
                <Button
                  label="Descartar"
                  variant="outline"
                  size="md"
                  iconStart={<Icon name="undo" size={20} color={colors.content} />}
                  disabled={saving}
                  onPress={handleDiscard}
                  className="flex-1"
                  testID="discard-path-adjust"
                />
              ) : null}
              <Button
                label="Salvar ajuste"
                loading={saving}
                loadingLabel="Salvando…"
                disabled={!dirty}
                iconStart={<Icon name="check" size={20} color={colors.white} />}
                onPress={() => void handleSave()}
                className="flex-1"
                testID="save-path-adjust"
              />
            </View>
          </Card>
        ) : (
          <Card variant="soft" className="gap-1 p-3">
            <Text variant="label">Nenhum caminho selecionado</Text>
            <Text variant="caption">
              Escolha um caminho na faixa acima ou toque em um traçado no mapa. Os outros continuam
              visíveis como referência.
            </Text>
          </Card>
        )}
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
      className={`min-h-16 w-44 flex-row items-center gap-2 rounded-lg border px-3 py-2 active:opacity-70 ${selected ? 'border-primary bg-primary-50' : 'border-border bg-background'}`}
    >
      <Icon
        name="vector-polyline"
        size={20}
        color={selected ? colors.primary : colors.gray500}
      />
      <View className="flex-1 gap-1">
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
