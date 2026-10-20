import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useMemo, useReducer, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AsyncContent } from '@/components/async-content';
import {
  MapActions,
  MapCanvas,
  MapToolbar,
  PoiMapLegend,
  PoiPalette,
  type MapCanvasHandle,
} from '@/components/poi-editor';
import { Screen } from '@/components/screen';
import { Alert, Button, Card, Dialog, EmptyState, Icon, Input, Text } from '@/components/ui';
import { repository } from '@/data';
import type { Area, AreaType, Path, PointOfInterest } from '@/data/types';
import { useAsyncData } from '@/hooks/useAsyncData';
import { useMapGestureNavigation } from '@/hooks/useMapGestureNavigation';
import { colors } from '@/theme/tokens';
import type { AreaRing } from '@/utils/areaGeometry';
import { toErrorMessage } from '@/utils/errors';
import { poiIcon } from '@/utils/poiIcons';
import {
  createInitialEditorState,
  poiEditorReducer,
  selectedArea,
  type AreaDraft,
} from '@/utils/poiEditor';

const AREA_TYPES: { value: AreaType; label: string }[] = [
  { value: 'alimentacao', label: 'Praça de alimentação' },
  { value: 'salao', label: 'Salão' },
  { value: 'exposicao', label: 'Área de exposição' },
  { value: 'foyer', label: 'Foyer' },
  { value: 'auditorio', label: 'Auditório' },
  { value: 'outro', label: 'Outro' },
];

type AreaEditorData = { areas: Area[]; paths: Path[]; pois: PointOfInterest[] };

export default function EditAreasScreen() {
  const { eventId, mapId } = useLocalSearchParams<{ eventId: string; mapId: string }>();
  const id = mapId ?? '';
  const mapGestures = useMapGestureNavigation();
  const [screenHeight, setScreenHeight] = useState(0);
  const data = useAsyncData(async (): Promise<AreaEditorData> => {
    const [areas, paths, pois] = await Promise.all([
      repository.listAreas(id),
      repository.listPaths(id),
      repository.listPois(id),
    ]);
    return { areas, paths, pois };
  }, id);

  return (
    <>
      <Stack.Screen options={{ ...mapGestures.screenOptions, title: 'Áreas do mapa' }} />
      <Screen
        scrollable
        scrollEnabled={!mapGestures.isMapTouchActive}
        onLayout={(event) => setScreenHeight(event.nativeEvent.layout.height)}
        testID="edit-areas-screen"
      >
        <AsyncContent state={data.state} onRetry={data.reload} loadingLabel="Carregando as áreas…">
          {(loaded) => (
            <AreaEditor
              key={id}
              mapId={id}
              eventId={eventId ?? ''}
              initialAreas={loaded.areas}
              paths={loaded.paths}
              pois={loaded.pois}
              touchHandlers={mapGestures.touchHandlers}
              screenHeight={screenHeight}
            />
          )}
        </AsyncContent>
      </Screen>
    </>
  );
}

type AreaEditorProps = {
  mapId: string;
  eventId: string;
  initialAreas: Area[];
  paths: Path[];
  pois: PointOfInterest[];
  touchHandlers: ReturnType<typeof useMapGestureNavigation>['touchHandlers'];
  screenHeight: number;
};

function AreaEditor({
  mapId,
  eventId,
  initialAreas,
  paths,
  pois,
  touchHandlers,
  screenHeight,
}: AreaEditorProps) {
  const canvasRef = useRef<MapCanvasHandle>(null);
  const insets = useSafeAreaInsets();
  const initialDrafts = useMemo(() => initialAreas.map(toAreaDraft), [initialAreas]);
  const [state, dispatch] = useReducer(poiEditorReducer, initialDrafts, createInitialEditorState);
  const area = selectedArea(state);
  const [savedAreas, setSavedAreas] = useState(initialAreas);
  const [name, setName] = useState('');
  const [areaType, setAreaType] = useState<AreaType>('outro');
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const selectedSignature = area
    ? `${area.id}|${area.name}|${area.type}|${area.description ?? ''}`
    : '';

  // Ajusta os campos quando a seleção (ou os dados persistidos da área
  // selecionada) muda. É o padrão de "ajustar estado quando uma entrada muda" —
  // no render, não num efeito, para não disparar um render em cascata. A
  // assinatura só muda quando a seleção ou os detalhes salvos mudam: mover um
  // vértice não pode apagar o que o organizador está digitando.
  const [syncedSignature, setSyncedSignature] = useState(selectedSignature);

  if (syncedSignature !== selectedSignature) {
    setSyncedSignature(selectedSignature);
    setName(area?.name ?? '');
    setAreaType(area?.type ?? 'outro');
    setDescription(area?.description ?? '');
    setValidationError(null);
    setError(null);
    setFeedback(null);
  }

  const context = useMemo(
    () => ({
      paths: paths.map((path) => path.geometry),
      pois: pois.map((poi) => ({
        id: poi.id,
        position: poi.position,
        icon: poiIcon(poi.type),
        label: poi.name,
      })),
      rects: pois.map((poi) => poi.rect),
    }),
    [paths, pois],
  );

  // Recupera o enquadramento do editor lembrado: o mapa ocupa cerca de 90% da
  // área útil e a legenda começa logo abaixo, mantendo os dados editáveis no scroll.
  const mapHeight =
    screenHeight > 0
      ? Math.round(Math.max(0, screenHeight - insets.bottom - 16) * 0.9)
      : 288;

  const isDirty = useMemo(() => {
    if (!area) return false;
    const saved = savedAreas.find((candidate) => candidate.id === area.id);
    if (!saved) return true;
    return (
      saved.name !== name.trim() ||
      saved.type !== areaType ||
      (saved.description ?? '') !== (description.trim() || '') ||
      JSON.stringify(saved.geometry) !== JSON.stringify(area.geometry)
    );
  }, [area, areaType, description, name, savedAreas]);

  const handleSave = async () => {
    if (!area) return;
    if (!name.trim()) {
      setValidationError('Informe um nome para a área.');
      return;
    }

    setIsSaving(true);
    setError(null);
    setValidationError(null);
    setFeedback(null);

    const changes = {
      name: name.trim(),
      type: areaType,
      geometry: area.geometry,
      description: description.trim() || null,
    };

    try {
      const existing = savedAreas.find((candidate) => candidate.id === area.id);
      const saved = existing
        ? await repository.updateArea(existing.id, changes)
        : await repository.createArea({ mapId, ...changes });

      if (!existing && saved.id !== area.id) {
        dispatch({ type: 'persist-area-id', areaId: area.id, persistedId: saved.id });
      }
      dispatch({
        type: 'update-area-details',
        areaId: saved.id,
        name: saved.name,
        areaType: saved.type,
        description: saved.description,
      });
      setSavedAreas((current) =>
        existing
          ? current.map((candidate) => (candidate.id === saved.id ? saved : candidate))
          : [...current, saved],
      );
      setFeedback('Área salva no mapa.');
    } catch (cause) {
      setError(toErrorMessage(cause, 'Não foi possível salvar a área.'));
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!area) return;
    setIsDeleting(true);
    setError(null);
    try {
      if (savedAreas.some((candidate) => candidate.id === area.id)) {
        await repository.deleteArea(area.id);
        setSavedAreas((current) => current.filter((candidate) => candidate.id !== area.id));
      }
      dispatch({ type: 'remove-selection' });
      setDeleteOpen(false);
      setFeedback('Área removida do mapa.');
    } catch (cause) {
      setError(toErrorMessage(cause, 'Não foi possível remover a área.'));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <View className="gap-3">
        <View
          className="relative overflow-hidden rounded-lg border border-border bg-background"
          style={{ height: mapHeight }}
          {...touchHandlers}
        >
          <MapCanvas
            ref={canvasRef}
            className="h-full w-full"
            state={state}
            dispatch={dispatch}
            context={context}
            accessibilityLabel={`Editor de áreas. ${state.areas.length} áreas no mapa.`}
            testID="areas-map-canvas"
          />
          <View className="absolute left-2 right-2 top-2 z-10 gap-2">
            <View className="flex-row items-start justify-between gap-2">
              <MapToolbar
                activeTool={state.activeTool}
                canUndo={state.history.length > 0}
                onSelectTool={(tool) => dispatch({ type: 'select-tool', tool })}
                onUndo={() => dispatch({ type: 'undo' })}
              />
              <MapActions
                canFit={state.areas.length > 0 || paths.length > 0 || pois.length > 0}
                onZoomIn={() => canvasRef.current?.zoomIn()}
                onZoomOut={() => canvasRef.current?.zoomOut()}
                onFit={() => canvasRef.current?.fitToAreas()}
              />
            </View>
            <PoiPalette
              armedPoiKind={state.armedPoiKind}
              onArmPoi={(kind) => dispatch({ type: 'arm-poi', kind })}
            />
          </View>
        </View>
      </View>

      <PoiMapLegend />

      <Text variant="caption">
        Desenhe uma região no mapa. Você pode mover o contorno ou ajustar seus vértices antes de salvar.
      </Text>

      <Card title="Áreas cadastradas" subtitle="Selecione uma região para editar seus dados.">
        {state.areas.length === 0 ? (
          <EmptyState
            compact
            icon="vector-polygon"
            title="Nenhuma área desenhada"
            description="Use “Desenhar área” ou “Desenho livre” no mapa para começar."
          />
        ) : (
          <View className="gap-2">
            {state.areas.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => dispatch({ type: 'select-area', areaId: item.id })}
                accessibilityRole="button"
                accessibilityState={{ selected: state.selectedAreaId === item.id }}
                accessibilityLabel={`${item.name || 'Área sem nome'}, ${areaTypeLabel(item.type)}`}
                className={`min-h-12 flex-row items-center gap-3 rounded-md border px-3 ${state.selectedAreaId === item.id ? 'border-primary bg-primary-50' : 'border-border bg-background'}`}
              >
                <Icon name="vector-polygon" size={20} color={colors.primary} />
                <View className="flex-1">
                  <Text variant="label">{item.name.trim() || 'Área sem nome'}</Text>
                  <Text variant="caption" tint="muted">{areaTypeLabel(item.type)}</Text>
                </View>
                {savedAreas.some((saved) => saved.id === item.id) ? null : (
                  <Text variant="caption" tint="warning">Não salva</Text>
                )}
              </Pressable>
            ))}
          </View>
        )}
      </Card>

      {area ? (
        <Card title="Dados da área" subtitle="Nome e tipo ajudam a identificar o espaço no mapa.">
          <Input
            label="Nome da área"
            value={name}
            onChangeText={(value) => {
              setName(value);
              setValidationError(null);
              setFeedback(null);
            }}
            placeholder="Ex.: Praça de alimentação"
            autoCapitalize="sentences"
            maxLength={120}
            errorText={validationError ?? undefined}
            testID="area-name"
          />

          <View className="gap-2">
            <Text variant="label">Tipo da área</Text>
            <View className="flex-row flex-wrap gap-2">
              {AREA_TYPES.map((option) => {
                const selected = areaType === option.value;
                return (
                  <Pressable
                    key={option.value}
                    onPress={() => {
                      setAreaType(option.value);
                      setFeedback(null);
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    className={`min-h-11 justify-center rounded-md border px-3 ${selected ? 'border-primary bg-primary-50' : 'border-border bg-background'}`}
                  >
                    <Text variant="caption" className={selected ? 'font-semibold text-primary' : undefined}>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <Input
            label="Descrição"
            value={description}
            onChangeText={(value) => {
              setDescription(value);
              setFeedback(null);
            }}
            placeholder="Informação complementar sobre o espaço"
            autoCapitalize="sentences"
            multiline
            maxLength={500}
            isOptional
            testID="area-description"
          />

          {error ? <Alert tone="error" title="Não foi possível salvar" description={error} /> : null}
          {feedback ? <Alert tone="success" title="Área atualizada" description={feedback} /> : null}

          <View className="gap-2">
            <Button
              label={savedAreas.some((saved) => saved.id === area.id) ? 'Salvar alterações' : 'Salvar área'}
              loading={isSaving}
              loadingLabel="Salvando…"
              disabled={!isDirty}
              onPress={() => void handleSave()}
              testID="save-area"
            />
            <Button
              label="Remover área"
              variant="danger"
              onPress={() => {
                setError(null);
                setDeleteOpen(true);
              }}
              testID="delete-area"
            />
          </View>
        </Card>
      ) : null}

      <Button
        label="Voltar à navegação"
        variant="ghost"
        onPress={() => router.dismissTo(`/organizer/event/${eventId}/map/${mapId}`)}
      />

      <Dialog
        open={deleteOpen}
        onClose={() => {
          if (!isDeleting) setDeleteOpen(false);
        }}
        icon="alert-outline"
        title="Remover área?"
        description={`${area?.name || 'Área sem nome'}. Esta ação não pode ser desfeita.`}
        destructive
        confirmLabel="Remover"
        confirmLoading={isDeleting}
        onConfirm={() => void confirmDelete()}
      >
        {error ? <Alert tone="error" title="Não foi possível remover" description={error} /> : null}
      </Dialog>
    </>
  );
}

function toAreaDraft(area: Area): AreaDraft {
  return {
    id: area.id,
    kind: area.geometry.length === 4 ? 'rectangle' : 'freehand',
    geometry: area.geometry as AreaRing,
    name: area.name,
    type: area.type,
    description: area.description,
    poiId: null,
  };
}

function areaTypeLabel(type: AreaType): string {
  return AREA_TYPES.find((item) => item.value === type)?.label ?? 'Outro';
}
