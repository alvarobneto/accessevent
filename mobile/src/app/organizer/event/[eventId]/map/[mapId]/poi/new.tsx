import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { Pressable, View, type GestureResponderEvent } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HeaderActions } from '@/components/header-actions';
import {
  MapActions,
  MapCanvas,
  MapToolbar,
  PoiMapLegend,
  PoiPalette,
  type MapCanvasContext,
  type MapCanvasHandle,
} from '@/components/poi-editor';
import { Screen } from '@/components/screen';
import { Dialog, Icon, Text } from '@/components/ui';
import { repository } from '@/data';
import type { Path, PointOfInterest } from '@/data/types';
import { useAsyncData } from '@/hooks/useAsyncData';
import { useMapGestureNavigation } from '@/hooks/useMapGestureNavigation';
import { useRefreshOnFocus } from '@/hooks/useRefreshOnFocus';
import { colors } from '@/theme/tokens';
import { markersFromPois, polylinesFromPaths, rectsFromPois } from '@/utils/mapContent';
import {
  createInitialEditorState,
  hasUndo,
  poiEditorReducer,
} from '@/utils/poiEditor';

/**
 * Listas vazias com identidade estável, como no hub: o `context` memoizado não
 * pode virar um objeto novo a cada render com o mesmo conteúdo.
 */
const NO_PATHS: readonly Path[] = [];
const NO_POIS: readonly PointOfInterest[] = [];

/**
 * Mapear um novo ponto — o editor de áreas e itens do protótipo.
 *
 * O organizador desenha os cômodos (Cômodo/Desenho livre), coloca um item por
 * área (paleta + toque no mapa) e, ao tocar em "Salvar", o desenho **não é
 * gravado**: abre um diálogo de sucesso e a Sprint 9 liga este estado em memória
 * (o `poiEditorReducer`, testado em `src/utils/`) à `PointOfInterest` de verdade.
 *
 * O que a tela **busca** é o contexto: os caminhos e pontos já gravados da
 * navegação viram o pano de fundo do desenho (polilinhas, marcações e pinos
 * acinzentados), porque desenhar sobre um local mapeado é diferente de desenhar
 * no vazio. A lista falhar não pode apagar o canvas — o desenho continua, e o
 * `Alert` de aviso diz que o contexto não carregou.
 *
  * A tela é fina: o desenho, os gestos e o enquadramento vivem no `MapCanvas`, e
  * aqui ficam a casca, as dicas que mudam conforme o estado armado e a confirmação
  * do fim da sessão do protótipo.
 */
export default function NewPoiScreen() {
  const { mapId } = useLocalSearchParams<{ eventId: string; mapId: string }>();
  const id = mapId ?? '';

  const [state, dispatch] = useReducer(poiEditorReducer, undefined, createInitialEditorState);
  const [saved, setSaved] = useState(false);
  const mapGestures = useMapGestureNavigation();
  const insets = useSafeAreaInsets();
  const [screenHeight, setScreenHeight] = useState(0);
  // O toque fora do retângulo do mapa fecha os modos de desenho e de posicionamento.
  const mapContainerRef = useRef<View | null>(null);
  const mapBoundsRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);

  const savedPaths = useAsyncData(() => repository.listPaths(id), id);
  const savedPois = useAsyncData(() => repository.listPois(id), id);

  useRefreshOnFocus((showIndicator) => {
    savedPaths.reload(showIndicator);
    savedPois.reload(showIndicator);
  });

  const canvasRef = useRef<MapCanvasHandle>(null);

  const paths = savedPaths.state.status === 'success' ? savedPaths.state.data : NO_PATHS;
  const pois = savedPois.state.status === 'success' ? savedPois.state.data : NO_POIS;

  // O contexto do desenho: o que o mapa já tem vira o pano de fundo do canvas. O
  // `icon` do `markersFromPois` sempre existe para ponto salvo; o fallback só
  // fecha o tipo de `MapCanvasContext` para quem o leitor de tela descreve.
  const context = useMemo<MapCanvasContext>(
    () => ({
      paths: polylinesFromPaths(paths).map((polyline) => polyline.geometry),
      pois: markersFromPois(pois).map((marker) => ({
        id: marker.id,
        position: marker.coordinate,
        icon: marker.icon ?? 'map-marker-question',
        label: marker.label,
      })),
      rects: rectsFromPois(pois).map((rect) => rect.rect),
    }),
    [paths, pois],
  );

  const hasContext = context.paths.length > 0 || context.pois.length > 0 || context.rects.length > 0;
  const contextFailed =
    savedPaths.state.status === 'error' || savedPois.state.status === 'error';
  const statusMessage = contextFailed
    ? 'O desenho continua, mas os caminhos e pontos já mapeados não aparecem no mapa.'
    : state.feedback;
  const statusTone = contextFailed ? 'warning' : 'info';
  const mapHeight =
    screenHeight > 0
      ? Math.round(Math.max(0, screenHeight - insets.bottom - 16) * 0.9)
      : 288;

  const canvasAccessibilityLabel = [
    'Mapa de desenho',
    paths.length > 0 ? `${paths.length} ${paths.length === 1 ? 'caminho' : 'caminhos'} já mapeados` : null,
    pois.length > 0
      ? `${pois.length} ${pois.length === 1 ? 'ponto de interesse' : 'pontos de interesse'} já mapeados`
      : null,
    state.areas.length > 0 || state.pois.length > 0
      ? `${state.areas.length} ${state.areas.length === 1 ? 'área desenhada' : 'áreas desenhadas'} e ${state.pois.length} ${state.pois.length === 1 ? 'ponto' : 'pontos'} no desenho`
      : null,
  ]
    .filter((part) => part !== null)
    .join(' com ');

  const deactivateTools = () => {
    if (state.activeTool !== 'none') {
      dispatch({ type: 'select-tool', tool: 'none' });
    } else if (state.armedPoiKind) {
      dispatch({ type: 'arm-poi', kind: state.armedPoiKind });
    }
  };

  const measureMapBounds = () => {
    mapContainerRef.current?.measureInWindow((x, y, width, height) => {
      mapBoundsRef.current = { x, y, width, height };
    });
  };

  const handleOutsideMapTouch = (event: GestureResponderEvent) => {
    if (state.activeTool === 'none' && state.armedPoiKind === null) return;

    const bounds = mapBoundsRef.current;
    if (!bounds) return;

    const { pageX, pageY } = event.nativeEvent;
    const touchedMap =
      pageX >= bounds.x &&
      pageX <= bounds.x + bounds.width &&
      pageY >= bounds.y &&
      pageY <= bounds.y + bounds.height;
    if (touchedMap) return;

    deactivateTools();
  };

  // O `feedback` do reducer some sozinho: 5s de leitura e a pista volta para a
  // dica do próximo passo.
  useEffect(() => {
    if (state.feedback === null) return undefined;
    const timer = setTimeout(() => dispatch({ type: 'clear-feedback' }), 5000);
    return () => clearTimeout(timer);
  }, [state.feedback]);

  return (
    <>
      <Stack.Screen
        options={{
          ...mapGestures.screenOptions,
          title: 'Adicionar ponto de interesse',
          // O canvas é arrastável em todos os sentidos, inclusive para a direita:
          // o gesto nativo de voltar do iOS (borda esquerda) disputaria o toque com
          // o pan do mapa. Desligado aqui — o voltar continua pelo botão do header.
          headerRight: () => (
            <HeaderActions>
              <Pressable
                onPress={() => {
                  deactivateTools();
                  setSaved(true);
                }}
                disabled={!hasPoints(state)}
                accessibilityRole="button"
                accessibilityLabel="Salvar pontos do desenho"
                accessibilityState={{ disabled: !hasPoints(state) }}
                testID="save-pois"
                className={hasPoints(state) ? '' : 'opacity-40'}
              >
                <Text variant="label" tint="primary">
                  Salvar
                </Text>
              </Pressable>
            </HeaderActions>
          ),
        }}
      />

      <View className="flex-1" onTouchStart={handleOutsideMapTouch}>
        <Screen
          scrollable
          scrollEnabled={!mapGestures.isMapTouchActive}
          onLayout={(event) => setScreenHeight(event.nativeEvent.layout.height)}
          contentClassName="gap-2 px-2 pb-4 pt-2"
          testID="new-poi-screen"
        >
          <View
            ref={mapContainerRef}
            onLayout={measureMapBounds}
            className="relative overflow-hidden rounded-xl border border-border bg-background"
            style={{ height: mapHeight }}
          >
            <View className="flex-1" {...mapGestures.touchHandlers}>
              <MapCanvas
                ref={canvasRef}
                state={state}
                dispatch={dispatch}
                context={context}
                className="h-full w-full"
                accessibilityLabel={canvasAccessibilityLabel}
                testID="map-canvas"
              />
            </View>

            <View className="absolute left-2 right-2 top-2 z-10 gap-2">
              <View className="flex-row items-start justify-between gap-2">
                <MapToolbar
                  activeTool={state.activeTool}
                  canUndo={hasUndo(state)}
                  onSelectTool={(tool) => dispatch({ type: 'select-tool', tool })}
                  onUndo={() => dispatch({ type: 'undo' })}
                />
                <MapActions
                  canFit={state.areas.length > 0 || hasContext}
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

            {statusMessage ? (
              <View className="absolute bottom-14 left-0 right-0 z-10">
                <View
                  className={`flex-row items-start gap-2 rounded-md border bg-background px-4 py-3 shadow-sm ${contextFailed ? 'border-warning-strong' : 'border-info-strong'}`}
                >
                  <Icon
                    name={contextFailed ? 'alert-outline' : 'information-outline'}
                    size={20}
                    color={contextFailed ? colors.warningStrong : colors.infoStrong}
                    className="mt-0.5"
                  />
                  <Text
                    variant="caption"
                    tint={statusTone}
                    className="flex-1"
                    accessibilityLiveRegion="polite"
                  >
                    {statusMessage}
                  </Text>
                </View>
              </View>
            ) : null}
          </View>

          <PoiMapLegend />

          <Dialog
            open={saved}
            onClose={() => setSaved(false)}
            icon="check"
            title="Pontos salvos"
            description="O protótipo não grava nada: o desenho fica em memória, e a Sprint 9 liga este editor à PointOfInterest de verdade."
            confirmLabel="Concluir"
            cancelLabel="Continuar desenhando"
            onConfirm={() => router.back()}
          />
        </Screen>
      </View>
    </>
  );
}

function hasPoints(state: ReturnType<typeof createInitialEditorState>): boolean {
  return state.pois.length > 0;
}

/**
 * A dica do próximo passo — o que o toque/gesto seguinte faz com o que está
 * armado. Só aparece quando não há `feedback` (o alerta de sistema tem prioridade,
 * para não anunciar duas coisas ao mesmo tempo no leitor de tela).
 */
