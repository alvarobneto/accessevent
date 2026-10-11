import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import {
  Linking,
  PanResponder,
  Pressable,
  StyleSheet,
  View,
  type GestureResponderEvent,
  type LayoutChangeEvent,
  type NativeTouchEvent,
  type PanResponderGestureState,
} from 'react-native';
import Svg, { Image as SvgImage, Line, Polygon, Polyline, Rect } from 'react-native-svg';

import { Text } from '@/components/ui/text';
import { colors } from '@/theme/tokens';
import type { Coordinate } from '@/types/coordinates';
import type { IconName } from '@/types/icon';
import type { MapGeometry } from '@/types/map';
import {
  DRAW_POINT_SPACING_PX,
  DEFAULT_RECTANGLE_SIDE_PX,
  MIN_AREA_RING_POINTS,
  MIN_DRAWING_LENGTH_PX,
  SIMPLIFY_TOLERANCE_PX,
  boundsOfRing,
  externalFreehandContour,
  moveRingVertex,
  pointInRing,
  rectanglePixelCornersAt,
  rectanglePixelCornersFromDrag,
  ringFromCorners,
  simplifyPoints,
  topmostAreaAt,
  translateRing,
  type AreaRing,
} from '@/utils/areaGeometry';
import type { ScreenPoint } from '@/utils/dropCoordinate';
import { rectCorners, type PoiRect } from '@/utils/poiAnchor';
import { cachedMapTileUri } from '@/services/mapTileCache';
import { tilesForViewport, type MapTile } from '@/utils/tiles';
import {
  INITIAL_CENTER,
  INITIAL_LATITUDE_DELTA,
  ZOOM_FACTOR,
  gridLatitudes,
  gridLongitudes,
  mapToScreen,
  normalizeViewport,
  panViewport,
  resizeViewport,
  screenToMap,
  viewportForBounds,
  zoomViewportAt,
  type CoordinateBounds,
  type MapViewport,
  type ViewportSize,
} from '@/utils/mapViewport';
import {
  clampPoiMarkerScale,
  POI_KIND_META,
  poiLabel,
  selectedArea,
  selectedPoi,
  type PoiEditorAction,
  type PoiEditorState,
} from '@/utils/poiEditor';

import { AreaShape, VertexHandles } from './area-shape';
import {
  POI_RESIZE_HANDLE_HIT_RADIUS,
  PoiMarker,
  poiResizeHandlePoint,
} from './poi-marker';

/** Toque sem arrasto: qualquer deslocamento abaixo disso é tap, não gesto. */
const TAP_THRESHOLD = 6;

/** A que distância de um vértice projetado o dedo "acerta" a alça. */
const VERTEX_TOLERANCE_PX = 24;

/** A que distância do centro projetado o dedo "acerta" um marcador. */
const POI_TOLERANCE_PX = 26;

/** O que o gesto em curso está fazendo — cada valor tem seu tratador de `move`. */
type GestureKind =
  | 'pan'
  | 'draw-rect'
  | 'draw-free'
  | 'move-area'
  | 'edit-vertex'
  | 'move-poi'
  | 'resize-poi'
  | 'pinch';

/**
 * O retrato do gesto em curso, mantido em `useRef`.
 *
 * Guarda a origem local (para converter `dx`/`dy` acumulados do `PanResponder` em
 * ponto local) e os dados de que o commit do gesto precisa no `release`: a
 * geometria original para mover/editar, o índice do vértice, o id do ponto.
 */
type ActiveGesture = {
  kind: GestureKind;
  /** Ponto local do toque, relativo ao contêiner do canvas. */
  startLocal: ScreenPoint;
  /** Últimos deslocamentos acumulados, para o pan usar o delta incremental. */
  lastDx: number;
  lastDy: number;
  /** Amostras do desenho livre, em pixel local. */
  freePointsPx: ScreenPoint[];
  areaId?: string;
  geometry?: AreaRing;
  vertexIndex?: number;
  poiId?: string;
  areaBounds?: CoordinateBounds | null;
  pinchLast?: { midPx: ScreenPoint; distance: number } | null;
  didPinch?: boolean;
  poiPosition?: Coordinate;
  resizeStartScale?: number;
  resizeStartDistance?: number;
  resizeScale?: number;
};

/**
 * O desenho **em trânsito** — o que aparece no meio do gesto e some no `release`.
 * `ring` é o desenho de área (retângulo/livre, mover, editar vértice) e `poi` é
 * o marcador seguindo a área, no arraste de ponto — em pixel, para o marcador
 * não compartilhar a unidade da coordenada geográfica.
 */
type Preview =
  | { kind: 'ring'; ring: AreaRing }
  | { kind: 'poi'; poi: ScreenPoint; poiId: string }
  | { kind: 'poi-scale'; poiId: string; scale: number };

/**
 * O que a tela já sabe sobre o local e serve de **pano de fundo** do desenho:
 * os caminhos gravados, os pontos cadastrados e a marcação (`rect`) de cada um.
 *
 * A tela monta isto a partir da API (`polylinesFromPaths`, `markersFromPois`,
 * `rectsFromPois`); o canvas só desenha. Nada daqui recebe toque — o contêiner é
 * o dono do gesto — e o `tone` é o mesmo do mapa lido: os trajetos entram como
 * **contexto**, não como atalho seguro, porque acessibilidade é dado do
 * organizador e o app não verifica (PRD §19).
 */
export type MapCanvasContext = {
  /** Geometrias dos caminhos gravados (`Path.geometry`). */
  paths: readonly MapGeometry[];
  /** Os pontos já salvos, com a posição, o ícone do tipo e o nome. */
  pois: readonly { id: string; position: Coordinate; icon: IconName; label: string }[];
  /** A caixa de marcação de cada ponto salvo (`rect`), para o desenho da área. */
  rects: readonly PoiRect[];
};

export type MapCanvasProps = {
  state: PoiEditorState;
  dispatch: (action: PoiEditorAction) => void;
  /**
   * O tamanho do canvas — `h-72` como as outras telas, `w-full`. O conteúdo
   * absoluto (SVG, marcadores, alças) assume `position: relative` no contêiner.
   */
  className?: string;
  /** Frase dita pelo leitor de tela sobre o mapa. */
  accessibilityLabel: string;
  /** O que já existe mapeado (caminhos, pontos e marcações) para desenhar atrás. */
  context?: MapCanvasContext;
  testID?: string;
};

/**
 * O que a tela consegue controlar no enquadramento do canvas.
 *
 * O viewport é interno do canvas; a barra de ações da tela chama estes métodos
 * pelo ref — o mesmo contrato do `EventMapHandle` da Sprint 7.
 */
export type MapCanvasHandle = {
  /** Aproxima o centro do canvas. */
  zoomIn: () => void;
  /** Afasta o centro do canvas. */
  zoomOut: () => void;
  /** Enquadra todas as áreas desenhadas. */
  fitToAreas: () => void;
};

/**
 * O canvas do editor: o desenho (SVG), os gestos e a conversão ponto↔coordenada.
 *
 * **Um único `PanResponder` no contêiner.** Todos os filhos (SVG, marcadores,
 * alças) são `pointerEvents="none"`: o canvas decide o que cada toque faz no
 * `grant`, testando em pixel o que está sob o dedo — ferramenta de desenho armada
 * > item da paleta armado > marcador selecionado > vértice da área selecionada
 * > dentro da área selecionada > pan. Com o toque sempre no contêiner,
 * `locationX`/`locationY` são locais do canvas sem medir a janela.
 *
 * **Gesto e commit são duas fases.** Durante o `move` o desenho vive em `preview`
 * (estado local); o `release` confirma **um** `commit` só — arraste e mudança de
 * vértice são **um** passo no histórico do reducer, não um por frame. Toque sem
 * arrasto (`TAP_THRESHOLD`) cria um quadrado quando a ferramenta retangular está
 * ativa; nos outros modos, seleciona ou coloca um ponto.
 *
 * O gesto de pinça usa os dois toques de `touches`, cada um com `locationX/Y`
 * relativo ao contêiner — o ponto médio vira âncora de `zoomViewportAt` e o
 * movimento dele vira `pan`. Sem medir a janela, no mesmo desenho dos filhos.
 */
export const MapCanvas = forwardRef<MapCanvasHandle, MapCanvasProps>(function MapCanvas(
  { state, dispatch, className, accessibilityLabel, context, testID },
  ref,
) {
  const [size, setSize] = useState<ViewportSize>({ width: 0, height: 0 });
  const [viewport, setViewport] = useState<MapViewport>({
    center: [...INITIAL_CENTER],
    latitudeDelta: INITIAL_LATITUDE_DELTA,
    longitudeDelta: INITIAL_LATITUDE_DELTA,
  });
  const [preview, setPreview] = useState<Preview | null>(null);

  const sizeRef = useRef(size);
  const viewportRef = useRef(viewport);
  const stateRef = useRef(state);

  const gestureRef = useRef<ActiveGesture | null>(null);

  // Contexto em ref para o `fitToAreas`/efeito de enquadramento lerem o valor do
  // render corrente sem recriar o `useCallback` a cada mudança.
  const contextRef = useRef(context);

  useEffect(() => {
    sizeRef.current = size;
    viewportRef.current = viewport;
    stateRef.current = state;
    contextRef.current = context;
  }, [context, size, state, viewport]);

  const applyViewport = useCallback((next: MapViewport) => {
    const normalized = normalizeViewport(next, sizeRef.current);
    viewportRef.current = normalized;
    setViewport(normalized);
  }, []);

  const fitToAreas = useCallback((): boolean => {
    const bounds = drawingBounds(contextRef.current, stateRef.current);
    if (!bounds || sizeRef.current.width <= 0 || sizeRef.current.height <= 0) return false;
    const next = viewportForBounds(bounds, sizeRef.current);
    if (!next) return false;
    applyViewport(next);
    return true;
  }, [applyViewport]);

  const zoomBy = useCallback((factor: number) => {
    const s = sizeRef.current;
    if (s.width <= 0 || s.height <= 0) return;
    applyViewport(zoomViewportAt(viewportRef.current, { x: s.width / 2, y: s.height / 2 }, factor, s));
  }, [applyViewport]);

  useImperativeHandle(
    ref,
    () => ({
      // Fator < 1 aproxima (deltas menores) e fator > 1 afasta (`zoomViewportAt`).
      zoomIn: () => zoomBy(1 / ZOOM_FACTOR),
      zoomOut: () => zoomBy(ZOOM_FACTOR),
      fitToAreas,
    }),
    [fitToAreas, zoomBy],
  );

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (width <= 0 || height <= 0) return;

    const previousSize = sizeRef.current;
    if (previousSize.width === width && previousSize.height === height) return;

    const nextSize = { width, height };
    const nextViewport = resizeViewport(viewportRef.current, previousSize, nextSize);
    sizeRef.current = nextSize;
    viewportRef.current = nextViewport;
    setSize(nextSize);
    setViewport(nextViewport);
  };

  // Enquadra a primeira coisa que dá enquadramento: o contexto da navegação
  // (caminhos/pontos já mapeados) quando ele chega, ou o primeiro cômodo quando o
  // desenho começa antes do contexto. Sem isso quem abre uma navegação já mapeada
  // veria o ponto inicial do pavilhão em vez do que existe. Depois da primeira
  // vez, quem enquadra é o botão Centralizar — um contexto recarregado no foco não
  // tira a câmera da mão de quem está desenhando.
  const hasFitted = useRef(false);
  useEffect(() => {
    if (hasFitted.current) return;
    if (fitToAreas()) hasFitted.current = true;
  }, [context, size, state.areas.length, fitToAreas]);

  const handleTap = (local: ScreenPoint, frame: ViewportSize, vp: MapViewport) => {
    const st = stateRef.current;

    if (st.activeTool === 'rectangle') {
      const corners = rectanglePixelCornersAt(local, frame, DEFAULT_RECTANGLE_SIDE_PX);
      if (!corners) return;
      const first = screenToMap(corners[0], vp, frame);
      const second = screenToMap(corners[1], vp, frame);
      if (first && second) {
        dispatch({ type: 'drop-area', kind: 'rectangle', geometry: ringFromCorners(first, second) });
      }
      return;
    }

    // O lápis só desenha durante um arraste. Um toque simples não seleciona outro
    // elemento nem desarma a ferramenta.
    if (st.activeTool === 'freehand') return;

    const coord = screenToMap(local, vp, frame);
    if (!coord) return;

    // Um tipo armado tem prioridade sobre os marcadores existentes: tocar em uma
    // área com um tipo selecionado coloca ou troca o item nesse local.
    if (st.armedPoiKind) {
      dispatch({ type: 'place-poi', position: coord });
      return;
    }

    // O marcador sob o dedo é toque no ponto — o mesmo alvo de `POI_TOLERANCE_PX`
    // do arraste, testado de trás para a frente (o último desenhado fica por cima).
    for (let i = st.pois.length - 1; i >= 0; i -= 1) {
      const poi = st.pois[i];
      const projected = poi ? mapToScreen(poi.position, vp, frame) : null;
      if (
        projected &&
        pointDistance(local, projected) <= POI_TOLERANCE_PX * (poi.markerScale ?? 1)
      ) {
        dispatch({ type: 'select-poi', poiId: poi.id });
        return;
      }
    }

    const target = topmostAreaAt(st.areas, coord);

    // Área sob o dedo seleciona; fundo do desenho desfaz a seleção.
    dispatch({ type: 'select-area', areaId: target ? target.id : null });
  };

  const handlePinchMove = (touches: readonly NativeTouchEvent[], gesture: ActiveGesture) => {
    if (touches.length < 2 || !touches[0] || !touches[1]) return;

    const [first, second] = touches;
    const midPx: ScreenPoint = {
      x: (first.locationX + second.locationX) / 2,
      y: (first.locationY + second.locationY) / 2,
    };
    const distance = Math.hypot(first.pageX - second.pageX, first.pageY - second.pageY);

    gesture.kind = 'pinch';
    if (!gesture.pinchLast) {
      gesture.pinchLast = { midPx, distance };
      return;
    }

    const last = gesture.pinchLast;
    if (last.distance < 10 || distance < 10) return;

    // Fator < 1 afasta o centro (deltas menores = mais zoom), que é o que separar
    // os dedos significa. Ancorar no ponto médio anterior e depois pan pelo
    // deslocamento do ponto médio mantém o que está sob a pinça parado.
    let next = zoomViewportAt(viewportRef.current, last.midPx, last.distance / distance, sizeRef.current);
    next = panViewport(next, midPx.x - last.midPx.x, midPx.y - last.midPx.y, sizeRef.current);
    applyViewport(next);

    gesture.pinchLast = { midPx, distance };
  };

  /**
   * A classificação do toque no `grant` decide o gesto inteiro.
   *
   * Ferramentas explícitas vencem objetos sob o dedo; em seguida vêm o tipo armado,
   * o marcador e as alças da área selecionada. Sem edição ativa, o fundo continua
   * livre para navegar. Nenhum filho do desenho participa do toque.
   */
  const handleGrant = (event: GestureResponderEvent) => {
    const frame = sizeRef.current;
    if (frame.width <= 0 || frame.height <= 0) return;

    const startLocal: ScreenPoint = { x: event.nativeEvent.locationX, y: event.nativeEvent.locationY };
    const st = stateRef.current;
    const vp = viewportRef.current;

    gestureRef.current = {
      kind: 'pan',
      startLocal,
      lastDx: 0,
      lastDy: 0,
      freePointsPx: [startLocal],
    };

    if (event.nativeEvent.touches.length >= 2) {
      gestureRef.current.kind = 'pinch';
      gestureRef.current.didPinch = true;
      return;
    }

    if (st.activeTool === 'rectangle') {
      gestureRef.current.kind = 'draw-rect';
      return;
    }
    if (st.activeTool === 'freehand') {
      gestureRef.current.kind = 'draw-free';
      return;
    }

    const selected = selectedPoi(st);
    if (selected) {
      const center = mapToScreen(selected.position, vp, frame);
      const scale = selected.markerScale ?? 1;
      const resizeHandle = center ? poiResizeHandlePoint(center, scale) : null;
      if (
        center &&
        resizeHandle &&
        pointDistance(startLocal, resizeHandle) <= POI_RESIZE_HANDLE_HIT_RADIUS
      ) {
        const gesture = gestureRef.current;
        gesture.kind = 'resize-poi';
        gesture.poiId = selected.id;
        gesture.poiPosition = selected.position;
        gesture.resizeStartScale = scale;
        gesture.resizeScale = scale;
        gesture.resizeStartDistance = pointDistance(startLocal, center);
        dispatch({ type: 'set-interaction', interaction: 'resize-poi' });
        return;
      }
    }

    for (let index = st.pois.length - 1; index >= 0; index -= 1) {
      const poi = st.pois[index];
      const projected = poi ? mapToScreen(poi.position, vp, frame) : null;
      if (
        poi &&
        projected &&
        pointDistance(startLocal, projected) <= POI_TOLERANCE_PX * (poi.markerScale ?? 1)
      ) {
        const area = st.areas.find((candidate) => candidate.id === poi.areaId) ?? null;
        const gesture = gestureRef.current;
        gesture.kind = 'move-poi';
        gesture.poiId = poi.id;
        gesture.areaBounds = area ? boundsOfRing(area.geometry) : null;
        dispatch({ type: 'select-poi', poiId: poi.id });
        dispatch({ type: 'set-interaction', interaction: 'move-poi' });
        return;
      }
    }

    // Com um tipo armado, arrastar o fundo continua movendo o mapa; o marcador
    // sob o dedo acima continua podendo ser reposicionado diretamente.
    if (st.armedPoiKind) return;

    const area = selectedArea(st);
    if (area && st.activeTool === 'none') {
      for (let i = 0; i < area.geometry.length; i += 1) {
        const vertex = mapToScreen(area.geometry[i], vp, frame);
        if (!vertex) continue;
        if (pointDistance(startLocal, vertex) <= VERTEX_TOLERANCE_PX) {
          const gesture = gestureRef.current;
          gesture.kind = 'edit-vertex';
          gesture.areaId = area.id;
          gesture.geometry = area.geometry;
          gesture.vertexIndex = i;
          dispatch({ type: 'set-interaction', interaction: 'edit-area' });
          return;
        }
      }

      const coord = screenToMap(startLocal, vp, frame);
      if (coord && pointInRing(coord, area.geometry)) {
        const gesture = gestureRef.current;
        gesture.kind = 'move-area';
        gesture.areaId = area.id;
        gesture.geometry = area.geometry;
        dispatch({ type: 'set-interaction', interaction: 'move-area' });
      }
    }
  };

  const currentLocal = (gesture: ActiveGesture, gestureState: PanResponderGestureState): ScreenPoint => ({
    x: gesture.startLocal.x + gestureState.dx,
    y: gesture.startLocal.y + gestureState.dy,
  });

  const handleMove = (event: GestureResponderEvent, gestureState: PanResponderGestureState) => {
    const gesture = gestureRef.current;
    if (!gesture) return;
    const frame = sizeRef.current;
    if (frame.width <= 0 || frame.height <= 0) return;

    const touches = event.nativeEvent.touches;
    if (touches.length >= 2) {
      if (gesture.kind === 'draw-rect' || gesture.kind === 'draw-free') {
        // Dois dedos significam navegar pelo mapa, mesmo com uma ferramenta de
        // desenho ativa: cancela o rascunho do gesto e entrega a pinça à câmera.
        gesture.kind = 'pinch';
        gesture.pinchLast = null;
        gesture.didPinch = true;
        setPreview(null);
      }
      handlePinchMove(touches, gesture);
      return;
    }
    if (gesture.kind === 'pinch') {
      // A pinça saiu para um dedo: o que sobra é pan a partir daqui.
      gesture.kind = 'pan';
      gesture.lastDx = gestureState.dx;
      gesture.lastDy = gestureState.dy;
      return;
    }

    const vp = viewportRef.current;
    const local = currentLocal(gesture, gestureState);

    switch (gesture.kind) {
      case 'pan': {
        applyViewport(
          panViewport(vp, gestureState.dx - gesture.lastDx, gestureState.dy - gesture.lastDy, frame),
        );
        gesture.lastDx = gestureState.dx;
        gesture.lastDy = gestureState.dy;
        break;
      }

      case 'draw-rect': {
        if (Math.max(Math.abs(gestureState.dx), Math.abs(gestureState.dy)) >= TAP_THRESHOLD) {
          const corners = rectanglePixelCornersFromDrag(gesture.startLocal, local, frame);
          const first = corners ? screenToMap(corners[0], vp, frame) : null;
          const second = corners ? screenToMap(corners[1], vp, frame) : null;
          setPreview(first && second ? { kind: 'ring', ring: ringFromCorners(first, second) } : null);
        } else {
          setPreview(null);
        }
        break;
      }

      case 'draw-free': {
        const last = gesture.freePointsPx[gesture.freePointsPx.length - 1] ?? gesture.startLocal;
        if (pointDistance(local, last) >= DRAW_POINT_SPACING_PX) {
          gesture.freePointsPx.push(local);
        }
        const simplified = simplifyPoints(gesture.freePointsPx, SIMPLIFY_TOLERANCE_PX);
        const contour = externalFreehandContour(simplified);
        const ring = contour.map((p) => screenToMap(p, vp, frame)).filter((c): c is Coordinate => c !== null);
        setPreview(ring.length >= MIN_AREA_RING_POINTS ? { kind: 'ring', ring } : null);
        break;
      }

      case 'move-area': {
        if (!gesture.geometry) break;
        const latPerPixel = vp.latitudeDelta / frame.height;
        const lngPerPixel = vp.longitudeDelta / frame.width;
        const delta: Coordinate = [
          (gesture.startLocal.y - local.y) * latPerPixel,
          (local.x - gesture.startLocal.x) * lngPerPixel,
        ];
        setPreview({ kind: 'ring', ring: translateRing(gesture.geometry, delta) });
        break;
      }

      case 'edit-vertex': {
        if (gesture.geometry && gesture.vertexIndex !== undefined) {
          const position = screenToMap(local, vp, frame);
          if (position) {
            setPreview({ kind: 'ring', ring: moveRingVertex(gesture.geometry, gesture.vertexIndex, position) });
          }
        }
        break;
      }

      case 'move-poi': {
        const position = screenToMap(local, vp, frame);
        if (position) {
          // O ponto não sai da área: o reducer recusaria com `poiMovedOut`, e o
          // preview já prende o marcador à borda para o gesto parecer honesto.
          const clamped = clampToBounds(position, gesture.areaBounds ?? null);
          const projected = mapToScreen(clamped, vp, frame);
          if (projected) setPreview({ kind: 'poi', poi: projected, poiId: gesture.poiId ?? '' });
        }
        break;
      }

      case 'resize-poi': {
        if (
          !gesture.poiPosition ||
          gesture.resizeStartScale === undefined ||
          !gesture.resizeStartDistance
        ) {
          break;
        }

        const center = mapToScreen(gesture.poiPosition, vp, frame);
        if (!center) break;

        const scale = clampPoiMarkerScale(
          gesture.resizeStartScale *
            (pointDistance(local, center) / gesture.resizeStartDistance),
        );
        gesture.resizeScale = scale;
        setPreview({ kind: 'poi-scale', poiId: gesture.poiId ?? '', scale });
        break;
      }
    }
  };

  const handleRelease = (_event: GestureResponderEvent, gestureState: PanResponderGestureState) => {
    const gesture = gestureRef.current;
    if (!gesture) return;

    const frame = sizeRef.current;
    const vp = viewportRef.current;
    gestureRef.current = null;
    setPreview(null);

    const isTap = Math.max(Math.abs(gestureState.dx), Math.abs(gestureState.dy)) < TAP_THRESHOLD;
    if (isTap) {
      if (!gesture.didPinch) handleTap(gesture.startLocal, frame, vp);
      return;
    }

    switch (gesture.kind) {
      case 'pan':
      case 'pinch':
        break;

      case 'draw-rect': {
        const local = currentLocal(gesture, gestureState);
        const corners = rectanglePixelCornersFromDrag(gesture.startLocal, local, frame);
        const first = corners ? screenToMap(corners[0], vp, frame) : null;
        const second = corners ? screenToMap(corners[1], vp, frame) : null;
        if (first && second && Math.max(Math.abs(gestureState.dx), Math.abs(gestureState.dy)) >= TAP_THRESHOLD) {
          dispatch({ type: 'drop-area', kind: 'rectangle', geometry: ringFromCorners(first, second) });
        }
        break;
      }

      case 'draw-free': {
        const points = gesture.freePointsPx;
        if (points.length >= MIN_AREA_RING_POINTS && polylineLengthPx(points) >= MIN_DRAWING_LENGTH_PX) {
          const simplified = simplifyPoints(points, SIMPLIFY_TOLERANCE_PX);
          const contour = externalFreehandContour(simplified);
          const ring = contour.map((p) => screenToMap(p, vp, frame)).filter((c): c is Coordinate => c !== null);
          if (ring.length >= MIN_AREA_RING_POINTS) {
            dispatch({ type: 'drop-area', kind: 'freehand', geometry: ring });
          }
        }
        break;
      }

      case 'move-area': {
        if (gesture.areaId && gesture.geometry) {
          const local = currentLocal(gesture, gestureState);
          const latPerPixel = vp.latitudeDelta / frame.height;
          const lngPerPixel = vp.longitudeDelta / frame.width;
          const delta: Coordinate = [
            (gesture.startLocal.y - local.y) * latPerPixel,
            (local.x - gesture.startLocal.x) * lngPerPixel,
          ];
          dispatch({ type: 'commit-move-area', areaId: gesture.areaId, geometry: translateRing(gesture.geometry, delta) });
        }
        break;
      }

      case 'edit-vertex': {
        if (gesture.areaId && gesture.geometry && gesture.vertexIndex !== undefined) {
          const position = screenToMap(currentLocal(gesture, gestureState), vp, frame);
          if (position) {
            dispatch({
              type: 'commit-edit-area',
              areaId: gesture.areaId,
              geometry: moveRingVertex(gesture.geometry, gesture.vertexIndex, position),
            });
          }
        }
        break;
      }

      case 'move-poi': {
        if (gesture.poiId) {
          const position = screenToMap(currentLocal(gesture, gestureState), vp, frame);
          if (position) {
            dispatch({
              type: 'commit-move-poi',
              poiId: gesture.poiId,
              position: clampToBounds(position, gesture.areaBounds ?? null),
            });
          }
        }
        break;
      }

      case 'resize-poi': {
        if (gesture.poiId && gesture.resizeScale !== undefined) {
          dispatch({
            type: 'resize-poi-marker',
            poiId: gesture.poiId,
            scale: gesture.resizeScale,
          });
        }
        break;
      }

    }
  };

  const responder = useMemo(
    () =>
      // Os refs são lidos pelos callbacks de gesto depois da montagem, nunca no render.
      // eslint-disable-next-line react-hooks/refs
      PanResponder.create({
        // O canvas é o dono do toque desde o primeiro frame: filhos não tocam e o
        // ScrollView da tela não rouba o gesto no meio do arraste.
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: handleGrant,
        onPanResponderMove: handleMove,
        onPanResponderRelease: handleRelease,
        onPanResponderTerminate: () => {
          gestureRef.current = null;
          setPreview(null);
          dispatch({ type: 'set-interaction', interaction: 'idle' });
        },
        onPanResponderTerminationRequest: () => false,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dispatch],
  );

  // ---- Desenho ----
  const gridLats = useMemo(() => gridLatitudes(viewport, size), [viewport, size]);
  const gridLngs = useMemo(() => gridLongitudes(viewport, size), [viewport, size]);

  // O mapa de fundo: os tiles do OSM cobrem o enquadramento com a mesma projeção
  // do desenho. A chave é a própria grade (`zoom/x/y`), então ao dar zoom ou
  // arrastar o `<Image>` de um tile que continua na tela não é remontado — o que
  // evita baixar a mesma imagem de novo a cada quadro do gesto.
  const tiles = useMemo(() => tilesForViewport(viewport, size), [viewport, size]);

  // O contexto (caminhos e marcações já salvos) é projetado em pixel uma vez por
  // quadro, como tudo que o canvas desenha. As polilinhas passam por fora do
  // canvas sem problema — o `<Svg>` recorta o que sai da própria caixa.
  const contextPaths = (context?.paths ?? []).map((geometry, index) => ({
    id: `ctx-path-${index}`,
    points: geometry
      .map((coordinate) => mapToScreen(coordinate, viewport, size))
      .map((point) => `${point.x},${point.y}`)
      .join(' '),
  }));

  const contextRects = (context?.rects ?? []).map((rect, index) => ({
    id: `ctx-rect-${index}`,
    points: rectCorners(rect)
      .map((coordinate) => mapToScreen(coordinate, viewport, size))
      .map((point) => `${point.x},${point.y}`)
      .join(' '),
  }));

  const projectedAreas = state.areas.map((area) => ({
    id: area.id,
    selected: state.selectedAreaId === area.id,
    points: projectRing(area.geometry, viewport, size),
  }));

  const markers = state.pois
    .map((poi) => ({
      poi,
      point: mapToScreen(poi.position, viewport, size),
    }))
    .filter((entry) => entry.point !== null);

  // O ponto arrastado é sempre o selecionado — o preview o acompanha apenas para
  // o marcador não congelar enquanto o dedo move a área.
  const draggingPoi =
    preview?.kind === 'poi' ? state.pois.find((poi) => poi.id === preview.poiId) ?? null : null;

  const handles =
    state.selectedAreaId && state.activeTool === 'none' && preview === null
      ? projectRing(state.areas.find((area) => area.id === state.selectedAreaId)?.geometry ?? [], viewport, size)
      : [];

  return (
    <View
      className={className}
      testID={testID}
      accessibilityLabel={accessibilityLabel}
      onLayout={handleLayout}
      style={styles.frame}
      {...responder.panHandlers}
    >
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill} pointerEvents="none">
        <Rect
          x={0}
          y={0}
          width={size.width}
          height={size.height}
          fill={colors.surface}
        />
        {tiles.map((tile) => (
          <CachedMapTile
            key={`${tile.zoom}/${tile.x}/${tile.y}`}
            tile={tile}
          />
        ))}
        {gridLats.map((latitude, index) => {
          const y = mapToScreen([latitude, viewport.center[1]], viewport, size).y;
          return <Line key={`lat-${index}`} x1={0} y1={y} x2={size.width} y2={y} stroke={colors.gray100} strokeWidth={1} />;
        })}
        {gridLngs.map((longitude, index) => {
          const x = mapToScreen([viewport.center[0], longitude], viewport, size).x;
          return <Line key={`lng-${index}`} x1={x} y1={0} x2={x} y2={size.height} stroke={colors.gray100} strokeWidth={1} />;
        })}

        {/* O trajeto já mapeado fica por cima do mapa: contorno branco + núcleo na
          cor do trajeto do app (o `tone` padrão do hub). Só o cinza sumia na
          fotografia do OSM — no fundo liso ele aparecia, agora precisava ficar
          legível sobre qualquer tile. */}
        {contextPaths.map((path) => (
          <Polyline
            key={`${path.id}-halo`}
            points={path.points}
            fill="none"
            stroke={colors.white}
            strokeWidth={7}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ))}
        {contextPaths.map((path) => (
          <Polyline
            key={path.id}
            points={path.points}
            fill="none"
            stroke={colors.primary}
            strokeWidth={4}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ))}

        {/* As marcações dos pontos salvos: o mesmo estilo do retângulo do `EventMap`
          (tom padrão), que o app já usa sobre o mapa. */}
        {contextRects.map((rect) => (
          <Polygon
            key={rect.id}
            points={rect.points}
            fill={colors.primary}
            fillOpacity={0.2}
            stroke={colors.primary}
            strokeWidth={2}
            strokeLinejoin="round"
          />
        ))}

        {projectedAreas.map((area) => (
          <AreaShape key={area.id} id={area.id} points={area.points} selected={area.selected} label={areaLabelFor(state, area.id)} />
        ))}

        {preview?.kind === 'ring' ? (
          <AreaShape
            id="preview"
            points={projectRing(preview.ring, viewport, size)}
            selected
            preview
            label="Preview"
          />
        ) : null}
      </Svg>

      {markers.map(({ poi, point }) => (
        <PoiMarker
          key={poi.id}
          point={point}
          selected={state.selectedPoiId === poi.id}
          isDragging={preview?.kind === 'poi' && preview.poiId === poi.id}
          label={poiLabel(poi.kind)}
          icon={POI_KIND_META[poi.kind].icon}
          scale={
            preview?.kind === 'poi-scale' && preview.poiId === poi.id
              ? preview.scale
              : (poi.markerScale ?? 1)
          }
          onResize={(scale) => dispatch({ type: 'resize-poi-marker', poiId: poi.id, scale })}
        />
      ))}

      {(context?.pois ?? []).map((poi) => (
        <PoiMarker
          key={`ctx-${poi.id}`}
          point={mapToScreen(poi.position, viewport, size)}
          selected={false}
          label={poi.label}
          icon={poi.icon}
        />
      ))}

      {preview?.kind === 'poi' && draggingPoi ? (
        <PoiMarker
          point={preview.poi}
          selected
          label={poiLabel(draggingPoi.kind)}
          icon={POI_KIND_META[draggingPoi.kind].icon}
          scale={draggingPoi.markerScale ?? 1}
        />
      ) : null}

      {handles.length > 0 ? (
        <VertexHandles points={handles} label={areaLabelFor(state, state.selectedAreaId)} />
      ) : null}

      {state.areas.length === 0 && preview === null ? (
        <Text
          variant="caption"
          tint="muted"
          pointerEvents="none"
          style={styles.hint}
          accessibilityLiveRegion="polite"
        >
          Use o quadrado para criar um cômodo ou o lápis para desenhar uma área livre.
        </Text>
      ) : null}

      <Pressable
        className="absolute bottom-2 right-2 min-h-11 justify-center rounded-md border border-border bg-surface px-2 shadow-sm"
        onPress={() => void Linking.openURL('https://www.openstreetmap.org/copyright')}
        accessibilityRole="link"
        accessibilityLabel="Créditos do OpenStreetMap"
        testID="osm-attribution"
      >
        <Text variant="caption" tint="muted">
          © colaboradores do OpenStreetMap
        </Text>
      </Pressable>
    </View>
  );
});

type CachedMapTileProps = {
  tile: MapTile;
};

function CachedMapTile({ tile }: CachedMapTileProps) {
  const [uri, setUri] = useState<string | null>(null);
  const { zoom, x, y, href } = tile;

  useEffect(() => {
    let active = true;
    void cachedMapTileUri({ zoom, x, y, href })
      .then((cachedUri) => {
        if (active) setUri(cachedUri);
      })
      .catch(() => {
        if (active) setUri(null);
      });

    return () => {
      active = false;
    };
  }, [href, x, y, zoom]);

  if (!uri) return null;

  return (
    <SvgImage
      href={uri}
      x={tile.rect.x}
      y={tile.rect.y}
      width={tile.rect.width}
      height={tile.rect.height}
      preserveAspectRatio="none"
    />
  );
}

function projectRing(ring: AreaRing, viewport: MapViewport, size: ViewportSize): ScreenPoint[] {
  return ring.map((coordinate) => mapToScreen(coordinate, viewport, size)).filter((p): p is ScreenPoint => p !== null);
}

function areaLabelFor(state: PoiEditorState, areaId: string | null): string {
  if (!areaId) return 'Área';
  const area = state.areas.find((candidate) => candidate.id === areaId);
  if (!area) return 'Área';
  const poi = area.poiId ? state.pois.find((candidate) => candidate.id === area.poiId) : undefined;
  return poi ? poiLabel(poi.kind) : area.kind === 'rectangle' ? 'Cômodo desenhado' : 'Área desenhada';
}

function pointDistance(a: ScreenPoint, b: ScreenPoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function polylineLengthPx(points: readonly ScreenPoint[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    const previous = points[i - 1];
    const current = points[i];
    if (previous && current) total += pointDistance(previous, current);
  }
  return total;
}

function clampToBounds(position: Coordinate, bounds: CoordinateBounds | null): Coordinate {
  if (!bounds) return position;
  const [latitude, longitude] = position;
  return [
    Math.min(Math.max(latitude, bounds.south), bounds.north),
    Math.min(Math.max(longitude, bounds.west), bounds.east),
  ];
}

function unionBounds(bounds: readonly CoordinateBounds[]): CoordinateBounds | null {
  if (bounds.length === 0) return null;
  let north = -Infinity;
  let south = Infinity;
  let east = -Infinity;
  let west = Infinity;
  for (const bound of bounds) {
    north = Math.max(north, bound.north);
    south = Math.min(south, bound.south);
    east = Math.max(east, bound.east);
    west = Math.min(west, bound.west);
  }
  return { north, south, east, west };
}

/**
 * O que precisa caber na tela: o desenho novo (áreas) mais o contexto da
 * navegação. Caminho e marcação são anéis — `boundsOfRing` trata os dois; a
 * posição do ponto já salvo entra como um anel de um ponto só, que é o que
 * mantém o marcador dentro do enquadramento.
 */
function drawingBounds(context: MapCanvasContext | undefined, state: PoiEditorState): CoordinateBounds | null {
  const rings: readonly (readonly Coordinate[])[] = [
    ...(context?.paths ?? []),
    ...(context?.rects.map((rect) => rectCorners(rect)) ?? []),
    ...(context?.pois.map((poi) => [poi.position]) ?? []),
    ...state.areas.map((area) => area.geometry),
  ];
  const bounds = rings.map(boundsOfRing).filter((b): b is CoordinateBounds => b !== null);
  return unionBounds(bounds);
}

const styles = StyleSheet.create({
  frame: {
    position: 'relative',
    width: '100%',
  },
  hint: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 12,
    textAlign: 'center',
  },
});
