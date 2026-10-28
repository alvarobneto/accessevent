import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
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
import type { Area, AreaType, Path, PoiType, PointOfInterest } from '@/data/types';
import { useAsyncData } from '@/hooks/useAsyncData';
import { useMapGestureNavigation } from '@/hooks/useMapGestureNavigation';
import { colors } from '@/theme/tokens';
import { topmostAreaAt, type AreaRing } from '@/utils/areaGeometry';
import { toErrorMessage } from '@/utils/errors';
import { CENTER_ANCHOR, rectFromCenter } from '@/utils/poiAnchor';
import {
  POI_KIND_META,
  POI_KIND_ORDER,
  createInitialEditorState,
  poiEditorReducer,
  poiInArea,
  poiLabel,
  selectedArea,
  selectedPoi,
  type AreaDraft,
  type PoiDraft,
  type PoiKind,
} from '@/utils/poiEditor';

const AREA_TYPES: { value: AreaType; label: string }[] = [
  { value: 'alimentacao', label: 'Praça de alimentação' },
  { value: 'salao', label: 'Salão' },
  { value: 'exposicao', label: 'Área de exposição' },
  { value: 'foyer', label: 'Foyer' },
  { value: 'auditorio', label: 'Auditório' },
  { value: 'outro', label: 'Outro' },
];

const KIND_TO_POI_TYPE: Record<PoiKind, PoiType> = {
  entrance: 'Entrada',
  exit: 'Saída',
  bathroom: 'Banheiro',
  stairs: 'Escada',
  elevator: 'Elevador',
  reception: 'Atendimento',
  accessibility: 'Banheiro acessível',
};

function poiTypeToKind(type: PoiType, name: string): PoiKind {
  const lower = name.trim().toLowerCase();
  if (type === 'Entrada') return 'entrance';
  if (type === 'Saída') return 'exit';
  if (type === 'Banheiro') return 'bathroom';
  if (type === 'Escada') return 'stairs';
  if (type === 'Elevador') return 'elevator';
  if (type === 'Atendimento' || lower.includes('recep')) return 'reception';
  if (type === 'Banheiro acessível' || type === 'Rampa' || lower.includes('acess')) {
    return 'accessibility';
  }
  return 'reception';
}

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
  const initialEditorSeed = useMemo(() => buildInitialEditorSeed(initialAreas, pois), [initialAreas, pois]);
  const [state, dispatch] = useReducer(
    poiEditorReducer,
    initialEditorSeed,
    (seed) => createInitialEditorState(seed.areas, seed.pois),
  );
  const area = selectedArea(state);
  const poi = selectedPoi(state);
  const [savedAreas, setSavedAreas] = useState(initialAreas);
  const [savedPois, setSavedPois] = useState(pois);
  const [name, setName] = useState('');
  const [areaType, setAreaType] = useState<AreaType>('outro');
  const [description, setDescription] = useState('');
  const [poiName, setPoiName] = useState('');
  const [poiKind, setPoiKind] = useState<PoiKind>('entrance');
  const [poiDescription, setPoiDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingPoi, setIsSavingPoi] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePoiOpen, setDeletePoiOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeletingPoi, setIsDeletingPoi] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [poiError, setPoiError] = useState<string | null>(null);
  const [poiFeedback, setPoiFeedback] = useState<string | null>(null);

  const selectedSignature = area
    ? `${area.id}|${area.name}|${area.type}|${area.description ?? ''}`
    : '';

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

  const selectedPoiSignature = poi
    ? `${poi.id}|${poi.kind}|${poi.name ?? ''}|${poi.description ?? ''}`
    : '';
  const [syncedPoiSignature, setSyncedPoiSignature] = useState(selectedPoiSignature);

  if (syncedPoiSignature !== selectedPoiSignature) {
    setSyncedPoiSignature(selectedPoiSignature);
    setPoiName(poi ? (poi.name?.trim() || poiLabel(poi.kind)) : '');
    setPoiKind(poi?.kind ?? 'entrance');
    setPoiDescription(poi?.description ?? '');
    setPoiError(null);
    setPoiFeedback(null);
  }

  const context = useMemo(
    () => ({
      paths: paths.map((path) => path.geometry),
      pois: [],
      rects: [],
    }),
    [paths],
  );

  const pendingGeometrySyncRef = useRef(new Map<string, string>());
  const pendingPoiPositionSyncRef = useRef(new Map<string, string>());

  useEffect(() => {
    for (const draft of state.areas) {
      const existing = savedAreas.find((candidate) => candidate.id === draft.id);
      if (!existing) continue;
      const nextSerialized = JSON.stringify(draft.geometry);
      if (JSON.stringify(existing.geometry) === nextSerialized) {
        pendingGeometrySyncRef.current.delete(draft.id);
        continue;
      }
      if (pendingGeometrySyncRef.current.get(draft.id) === nextSerialized) {
        continue;
      }
      pendingGeometrySyncRef.current.set(draft.id, nextSerialized);
      void repository
        .updateArea(existing.id, { geometry: draft.geometry })
        .then((updated) => {
          setSavedAreas((current) =>
            current.map((candidate) => (candidate.id === updated.id ? updated : candidate)),
          );
          setFeedback('Formato da área salvo no mapa.');
        })
        .catch((cause) => {
          pendingGeometrySyncRef.current.delete(draft.id);
          setError(toErrorMessage(cause, 'Não foi possível salvar a mudança de forma da área.'));
        });
    }
  }, [savedAreas, state.areas]);

  useEffect(() => {
    for (const draft of state.pois) {
      const existing = savedPois.find((candidate) => candidate.id === draft.id);
      if (!existing) continue;
      const nextSerialized = JSON.stringify(draft.position);
      if (JSON.stringify(existing.position) === nextSerialized) {
        pendingPoiPositionSyncRef.current.delete(draft.id);
        continue;
      }
      if (pendingPoiPositionSyncRef.current.get(draft.id) === nextSerialized) {
        continue;
      }
      pendingPoiPositionSyncRef.current.set(draft.id, nextSerialized);
      void repository
        .updatePoi(existing.id, {
          rect: rectFromCenter(draft.position),
          anchor: CENTER_ANCHOR,
        })
        .then((updated) => {
          setSavedPois((current) =>
            current.map((candidate) => (candidate.id === updated.id ? updated : candidate)),
          );
          setPoiFeedback('Posição do ponto salva no mapa.');
        })
        .catch((cause) => {
          pendingPoiPositionSyncRef.current.delete(draft.id);
          setPoiError(toErrorMessage(cause, 'Não foi possível salvar a nova posição do ponto.'));
        });
    }
  }, [savedPois, state.pois]);

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
    const innerPoi = poiInArea(state, area.id);
    const innerPoiUnsaved = innerPoi
      ? !savedPois.some((candidate) => candidate.id === innerPoi.id)
      : false;
    return (
      innerPoiUnsaved ||
      saved.name !== name.trim() ||
      saved.type !== areaType ||
      (saved.description ?? '') !== (description.trim() || '') ||
      JSON.stringify(saved.geometry) !== JSON.stringify(area.geometry)
    );
  }, [area, areaType, description, name, savedAreas, savedPois, state]);

  const isPoiDirty = useMemo(() => {
    if (!poi) return false;
    const saved = savedPois.find((candidate) => candidate.id === poi.id);
    if (!saved) return true;
    const targetName = poiName.trim() || poiLabel(poiKind);
    const targetType = KIND_TO_POI_TYPE[poiKind];
    return (
      saved.name !== targetName ||
      saved.type !== targetType ||
      (saved.description ?? '') !== (poiDescription.trim() || '') ||
      JSON.stringify(saved.position) !== JSON.stringify(poi.position)
    );
  }, [poi, poiDescription, poiKind, poiName, savedPois]);

  const persistPoiDraft = async (draft: PoiDraft, customName?: string, customKind?: PoiKind, customDesc?: string | null) => {
    const kindToUse = customKind ?? draft.kind;
    const typeToUse = KIND_TO_POI_TYPE[kindToUse];
    const nameToUse = (customName ?? draft.name ?? '').trim() || poiLabel(kindToUse);
    const descToUse = customDesc !== undefined ? customDesc : (draft.description ?? null);
    const existingPoi = savedPois.find((candidate) => candidate.id === draft.id);
    const payload = {
      name: nameToUse,
      type: typeToUse,
      rect: rectFromCenter(draft.position),
      anchor: CENTER_ANCHOR,
      description: descToUse,
    };

    const saved = existingPoi
      ? await repository.updatePoi(existingPoi.id, payload)
      : await repository.createPoi({ mapId, ...payload });

    if (!existingPoi && saved.id !== draft.id) {
      dispatch({ type: 'persist-poi-id', poiId: draft.id, persistedId: saved.id });
    }
    dispatch({
      type: 'update-poi-details',
      poiId: saved.id,
      name: saved.name,
      kind: kindToUse,
      description: saved.description,
    });
    setSavedPois((current) =>
      existingPoi
        ? current.map((candidate) => (candidate.id === saved.id ? saved : candidate))
        : [...current, saved],
    );
    return saved;
  };

  const handleSave = async () => {
    if (!area) return;
    const innerPoi = poiInArea(state, area.id);
    const resolvedName = name.trim() || (innerPoi ? poiLabel(innerPoi.kind) : '');
    if (!resolvedName) {
      setValidationError('Informe um nome para a área.');
      return;
    }

    setIsSaving(true);
    setError(null);
    setValidationError(null);
    setFeedback(null);

    const changes = {
      name: resolvedName,
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

      if (innerPoi) {
        await persistPoiDraft(innerPoi);
      }

      setFeedback(innerPoi ? 'Área e ponto de interesse salvos no mapa.' : 'Área salva no mapa.');
    } catch (cause) {
      setError(toErrorMessage(cause, 'Não foi possível salvar a área.'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePoi = async () => {
    if (!poi) return;
    setIsSavingPoi(true);
    setPoiError(null);
    setPoiFeedback(null);

    try {
      if (poi.areaId) {
        const parentArea = state.areas.find((candidate) => candidate.id === poi.areaId);
        const existingParent = parentArea
          ? savedAreas.find((candidate) => candidate.id === parentArea.id)
          : undefined;
        if (parentArea && !existingParent) {
          const fallbackAreaName = parentArea.name.trim() || poiName.trim() || poiLabel(poiKind);
          const savedArea = await repository.createArea({
            mapId,
            name: fallbackAreaName,
            type: parentArea.type,
            geometry: parentArea.geometry,
            description: parentArea.description,
          });
          if (savedArea.id !== parentArea.id) {
            dispatch({ type: 'persist-area-id', areaId: parentArea.id, persistedId: savedArea.id });
          }
          dispatch({
            type: 'update-area-details',
            areaId: savedArea.id,
            name: savedArea.name,
            areaType: savedArea.type,
            description: savedArea.description,
          });
          setSavedAreas((current) => [...current, savedArea]);
        } else if (
          parentArea &&
          existingParent &&
          JSON.stringify(existingParent.geometry) !== JSON.stringify(parentArea.geometry)
        ) {
          const updatedArea = await repository.updateArea(existingParent.id, {
            geometry: parentArea.geometry,
          });
          setSavedAreas((current) =>
            current.map((candidate) => (candidate.id === updatedArea.id ? updatedArea : candidate)),
          );
        }
      }

      await persistPoiDraft(
        poi,
        poiName.trim() || poiLabel(poiKind),
        poiKind,
        poiDescription.trim() || null,
      );
      setPoiFeedback('Ponto de interesse salvo no mapa.');
    } catch (cause) {
      setPoiError(toErrorMessage(cause, 'Não foi possível salvar o ponto de interesse.'));
    } finally {
      setIsSavingPoi(false);
    }
  };

  const confirmDelete = async () => {
    if (!area) return;
    setIsDeleting(true);
    setError(null);
    try {
      if (area.poiId && savedPois.some((candidate) => candidate.id === area.poiId)) {
        await repository.deletePoi(area.poiId);
        setSavedPois((current) => current.filter((candidate) => candidate.id !== area.poiId));
      }
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

  const confirmDeletePoi = async () => {
    if (!poi) return;
    setIsDeletingPoi(true);
    setPoiError(null);
    try {
      if (savedPois.some((candidate) => candidate.id === poi.id)) {
        await repository.deletePoi(poi.id);
        setSavedPois((current) => current.filter((candidate) => candidate.id !== poi.id));
      }
      dispatch({ type: 'remove-selection' });
      setDeletePoiOpen(false);
      setPoiFeedback('Ponto de interesse removido do mapa.');
    } catch (cause) {
      setPoiError(toErrorMessage(cause, 'Não foi possível remover o ponto de interesse.'));
    } finally {
      setIsDeletingPoi(false);
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
                canFit={
                  state.areas.length > 0 ||
                  state.pois.length > 0 ||
                  paths.length > 0 ||
                  savedPois.length > 0
                }
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
        Desenhe uma região ou escolha um ícone no topo e toque no mapa para posicionar. Depois, salve nos cartões abaixo.
      </Text>

      <Card
        title="Pontos de interesse cadastrados"
        subtitle="Selecione um ícone para editar ou salvar no mapa."
      >
        {state.pois.length === 0 ? (
          <EmptyState
            compact
            icon="map-marker-outline"
            title="Nenhum ponto de interesse no mapa"
            description="Toque em um ícone no topo do mapa (como Banheiro ou Recepção) e depois toque no mapa."
          />
        ) : (
          <View className="gap-2">
            {state.pois.map((item) => {
              const label = item.name?.trim() || poiLabel(item.kind);
              const isSelected = state.selectedPoiId === item.id;
              return (
                <Pressable
                  key={item.id}
                  onPress={() => dispatch({ type: 'select-poi', poiId: item.id })}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={`${label}, ${poiLabel(item.kind)}`}
                  className={`min-h-12 flex-row items-center gap-3 rounded-md border px-3 ${isSelected ? 'border-primary bg-primary-50' : 'border-border bg-background'}`}
                >
                  <Icon name={POI_KIND_META[item.kind].icon} size={20} color={colors.primary} />
                  <View className="flex-1">
                    <Text variant="label">{label}</Text>
                    <Text variant="caption" tint="muted">
                      {poiLabel(item.kind)}
                    </Text>
                  </View>
                  {savedPois.some((saved) => saved.id === item.id) ? null : (
                    <Text variant="caption" tint="warning">
                      Não salvo
                    </Text>
                  )}
                </Pressable>
              );
            })}
          </View>
        )}
      </Card>

      {poi ? (
        <Card
          title="Dados do ponto de interesse"
          subtitle="Confira o nome e o tipo e toque em salvar para gravar o ícone no mapa."
        >
          <Input
            label="Nome do ponto"
            value={poiName}
            onChangeText={(value) => {
              setPoiName(value);
              setPoiFeedback(null);
            }}
            placeholder={poiLabel(poiKind)}
            autoCapitalize="sentences"
            maxLength={120}
            isOptional
            testID="poi-name-input"
          />

          <View className="gap-2">
            <Text variant="label">Tipo do ícone</Text>
            <View className="flex-row flex-wrap gap-2">
              {POI_KIND_ORDER.map((kindOption) => {
                const selected = poiKind === kindOption;
                return (
                  <Pressable
                    key={kindOption}
                    onPress={() => {
                      setPoiKind(kindOption);
                      if (!poiName.trim() || poiName.trim() === poiLabel(poiKind)) {
                        setPoiName(poiLabel(kindOption));
                      }
                      setPoiFeedback(null);
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    className={`min-h-11 flex-row items-center gap-1.5 rounded-md border px-3 ${selected ? 'border-primary bg-primary-50' : 'border-border bg-background'}`}
                  >
                    <Icon
                      name={POI_KIND_META[kindOption].icon}
                      size={16}
                      color={selected ? colors.primary : colors.content}
                    />
                    <Text
                      variant="caption"
                      className={selected ? 'font-semibold text-primary' : undefined}
                    >
                      {poiLabel(kindOption)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <Input
            label="Descrição"
            value={poiDescription}
            onChangeText={(value) => {
              setPoiDescription(value);
              setPoiFeedback(null);
            }}
            placeholder="Informação complementar sobre este ponto"
            autoCapitalize="sentences"
            multiline
            maxLength={500}
            isOptional
            testID="poi-description-input"
          />

          {poiError ? (
            <Alert tone="error" title="Não foi possível salvar" description={poiError} />
          ) : null}
          {poiFeedback ? (
            <Alert tone="success" title="Ponto salvo" description={poiFeedback} />
          ) : null}

          <View className="gap-2">
            <Button
              label={
                savedPois.some((saved) => saved.id === poi.id)
                  ? 'Salvar alterações do ponto'
                  : 'Salvar ponto'
              }
              loading={isSavingPoi}
              loadingLabel="Salvando…"
              disabled={!isPoiDirty}
              onPress={() => void handleSavePoi()}
              testID="save-poi"
            />
            <Button
              label="Remover ponto"
              variant="danger"
              onPress={() => {
                setPoiError(null);
                setDeletePoiOpen(true);
              }}
              testID="delete-poi"
            />
          </View>
        </Card>
      ) : null}

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

      <Dialog
        open={deletePoiOpen}
        onClose={() => {
          if (!isDeletingPoi) setDeletePoiOpen(false);
        }}
        icon="alert-outline"
        title="Remover ponto de interesse?"
        description={`${poi?.name?.trim() || (poi ? poiLabel(poi.kind) : 'Ponto')}. Esta ação não pode ser desfeita.`}
        destructive
        confirmLabel="Remover"
        confirmLoading={isDeletingPoi}
        onConfirm={() => void confirmDeletePoi()}
      >
        {poiError ? (
          <Alert tone="error" title="Não foi possível remover" description={poiError} />
        ) : null}
      </Dialog>
    </>
  );
}

function buildInitialEditorSeed(
  initialAreas: Area[],
  initialPois: PointOfInterest[],
): { areas: AreaDraft[]; pois: PoiDraft[] } {
  const areas: AreaDraft[] = initialAreas.map((area) => ({
    id: area.id,
    kind: area.geometry.length === 4 ? 'rectangle' : 'freehand',
    geometry: area.geometry as AreaRing,
    name: area.name,
    type: area.type,
    description: area.description,
    poiId: null,
  }));

  const pois: PoiDraft[] = initialPois.map((item) => {
    const matchingArea = topmostAreaAt(areas, item.position);
    const areaId = matchingArea && !matchingArea.poiId ? matchingArea.id : '';
    if (matchingArea && !matchingArea.poiId) {
      matchingArea.poiId = item.id;
    }
    return {
      id: item.id,
      kind: poiTypeToKind(item.type, item.name),
      position: item.position,
      areaId,
      name: item.name,
      description: item.description,
    };
  });

  return { areas, pois };
}

function areaTypeLabel(type: AreaType): string {
  return AREA_TYPES.find((item) => item.value === type)?.label ?? 'Outro';
}
