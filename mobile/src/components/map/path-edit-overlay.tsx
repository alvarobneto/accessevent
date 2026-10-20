import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  PanResponder,
  StyleSheet,
  View,
  type GestureResponderEvent,
  type PanResponderGestureState,
} from 'react-native';

import { colors } from '@/theme/tokens';
import type { Coordinate } from '@/types/coordinates';
import type { MapGeometry } from '@/types/map';
import type { ScreenPoint } from '@/utils/dropCoordinate';
import { moveControlPoint, nudgeControlPoint } from '@/utils/pathGeometry';

/**
 * Tamanho do alvo de cada alça, em pixels — o piso de 44px do `design.md`.
 *
 * É o alvo acessível da alça. As alças representam as pontas e as mudanças de
 * direção da rota, embora a geometria completa continue preservada.
 */
export const PATH_HANDLE_SPACING = 44;

/** Desenho da alça de vértice: 44px de alvo com 16px de círculo, como o de canto. */
const HANDLE_DRAW_SIZE = 16;

/**
 * Distância, em pixels, a partir da qual o toque vira arrasto — o mesmo
 * `DRAG_THRESHOLD` da paleta e das alças de canto, pelos mesmos motivos: abaixo
 * dele ninguém toma o gesto e o toque passa, e dois limiares diferentes fariam o
 * mesmo dedo se comportar de jeito diferente em lugares diferentes da tela.
 */
const DRAG_THRESHOLD = 24;

/** Alça de vértice projetada: o índice do ponto na geometria e o pixel atual. */
export type PathHandle = {
  index: number;
  point: ScreenPoint;
};

/** O alvo que está sendo arrastado agora; `point: null` é antes do primeiro `move`. */
type ActiveDrag = {
  index: number;
  point: ScreenPoint | null;
};

type PreviewHandles = {
  sourceHandles: readonly PathHandle[];
  points: ReadonlyMap<number, ScreenPoint>;
};

export type PathEditOverlayProps = {
  /** O trajeto em edição, com a geometria corrente (o rascunho da tela). */
  geometry: MapGeometry;
  /** Os vértices que viraram alça, já projetados em pixel pelo `EventMap`. */
  handles: readonly PathHandle[];
  /** Converte o ponto de arraste em coordenada, ou `null` se não dá. */
  resolveCoordinate: (point: ScreenPoint) => Promise<Coordinate | null>;
  /** Projeta uma coordenada de volta em pixel — é como a alça arrastada segue o dedo. */
  projectCoordinate: (coordinate: Coordinate) => Promise<ScreenPoint | null>;
  /** Chamado a cada `move` com o trajeto novo (pré-visualização). */
  onPreview: (geometry: MapGeometry) => void;
  /** Chamado ao soltar, com o trajeto final do gesto. */
  onCommit?: (geometry: MapGeometry) => void;
  /** Liga e desliga o congelamento da projeção no `EventMap` durante o gesto. */
  onDragStateChange: (dragging: boolean) => void;
  /** Rótulo do trajeto para o leitor de tela; as alças entram nele. */
  accessibilityLabel: string;
};

/**
 * A camada de interação do trajeto em edição: alças dos vértices já existentes,
 * desenhadas por cima do mapa.
 *
 * **Por que isto existe e o desenho continua geográfico.** O `Polyline` do
 * `react-native-maps` é desenhado pela plataforma, em coordenadas, e não aceita
 * toque localizado nem posição em pixel — é exatamente o que ele deve fazer. Mas
 * arrastar um ponto do trajeto é um alvo de 44px no pixel onde o ponto aparece
 * *agora*, e esse pixel muda a cada zoom e a cada pan. Então quem desenha é a
 * polilinha (as mesmas coordenadas que a API devolve), e quem recebe o gesto é
 * esta camada, reposicionada quando a câmera mexe — a mesma divisão das alças de
 * canto do retângulo (`poi-rect-handles.tsx`), pelo mesmo motivo.
 *
 * Só as alças capturam gestos: a linha e o fundo continuam pertencendo ao mapa,
 * permitindo mover a câmera sem criar vértices. Arrastar reposiciona o vértice de
 * controle e redistribui as amostras dos trechos adjacentes, sem alterar a contagem
 * nem a identidade dos pontos. Quem usa leitor de tela ajusta as mesmas alças pelas
 * ações acessíveis.
 */
export function PathEditOverlay({
  geometry,
  handles,
  resolveCoordinate,
  projectCoordinate,
  onPreview,
  onCommit,
  onDragStateChange,
  accessibilityLabel,
}: PathEditOverlayProps) {
  /**
   * A geometria e os callbacks de agora, lidos pelos respondentes sem recriá-los.
   *
   * Os `PanResponder`s são memoizados por `handles` — recriar um por
   * quadro durante o arraste é centenas de objetos a cada `move`. Como o
   * React Native relê os `panHandlers` das props a cada evento do gesto, o
   * caminho seguro é que o fechamento leia a referência mais nova aqui em vez
   * de fechar sobre o valor do render em que foi criado.
   */
  const latest = useRef({
    geometry,
    resolveCoordinate,
    projectCoordinate,
    onPreview,
    onCommit,
    onDragStateChange,
  });
  useEffect(() => {
    latest.current = {
      geometry,
      resolveCoordinate,
      projectCoordinate,
      onPreview,
      onCommit,
      onDragStateChange,
    };
  }, [geometry, resolveCoordinate, projectCoordinate, onPreview, onCommit, onDragStateChange]);

  /**
   * A última prévia do gesto corrente, atualizada síncrono em cada `move`.
   *
   * Cada prévia substitui só o vértice arrastado em `dragStartGeometry`; assim os
   * demais pontos não acumulam deltas nem mudam de posição entre quadros.
   */
  const pending = useRef<MapGeometry | null>(null);
  /** Geometria fixa no início do gesto; cada quadro é calculado sem acumular deltas. */
  const dragStartGeometry = useRef<MapGeometry | null>(null);

  /** Só um arraste por vez: o segundo dedo em outro alvo não vira um segundo gesto. */
  const dragActive = useRef(false);
  /** Invalida conversões assíncronas antigas e eventos que chegam depois da soltura. */
  const moveSequence = useRef(0);

  const [activeDrag, setActiveDrag] = useState<ActiveDrag | null>(null);
  const [previewHandles, setPreviewHandles] = useState<PreviewHandles | null>(null);
  const controlIndices = useMemo(() => handles.map((handle) => handle.index), [handles]);

  /**
   * Confirma uma alteração feita pelo leitor de tela.
   *
   * Cada ação é um passo completo e discreto: a mesma geometria que o dedo
   * gravaria, aplicada de uma vez — e, como não há gesto para soltar, o commit
   * vai junto com a pré-visualização, senão a alteração nunca seria marcada.
   */
  const commitNudge = useCallback(
    (index: number, direction: 'out' | 'in') => {
      const next = nudgeControlPoint(geometry, controlIndices, index, direction);
      if (next === geometry) return;

      onPreview(next);
      onCommit?.(next);
    },
    [geometry, controlIndices, onPreview, onCommit],
  );

  /** Soltou (ou o gesto foi tomado): confirma o que o arraste produziu. */
  const finishGesture = useCallback(() => {
    moveSequence.current += 1;
    const final = pending.current;

    pending.current = null;
    dragStartGeometry.current = null;
    dragActive.current = false;
    setActiveDrag(null);
    latest.current.onDragStateChange(false);

    // Sem `final` não houve `move` que virou geometria: um toque que passou do
    // limiar e não resolveu coordenada nenhuma não é alteração.
    if (final) latest.current.onCommit?.(final);
  }, []);

  /** Tomou o gesto: congela a projeção no `EventMap` e zera o acumulado. */
  const claimGesture = useCallback(() => {
    if (dragActive.current) return false;

    dragActive.current = true;
    moveSequence.current += 1;
    pending.current = null;
    dragStartGeometry.current = latest.current.geometry;
    setPreviewHandles(null);
    latest.current.onDragStateChange(true);
    return true;
  }, []);

  const vertexResponders = useMemo(
    () =>
      // Os respondentes leem refs (`latest`, `pending`, `dragActive`) só dentro
      // dos handlers do gesto, nunca durante o render; o `useMemo` é o que
      // evita recriar centenas de `PanResponder` a cada quadro de arraste.
      // eslint-disable-next-line react-hooks/refs
      handles.map((handle) => {
        const index = handle.index;
        return PanResponder.create({
          // A alça captura o toque desde o início. Se esperasse o limiar de
          // movimento para virar responder, o MapView poderia começar um pan ao
          // mesmo tempo e interpretar a soltura como toque no trajeto. A alça é
          // um alvo dedicado: o gesto fica exclusivamente com o vértice.
          onStartShouldSetPanResponder: (event: GestureResponderEvent) =>
            event.nativeEvent.touches.length === 1,
          onMoveShouldSetPanResponder: () => false,
          onPanResponderGrant: () => {
            if (!claimGesture()) return;
            setActiveDrag({ index, point: null });
          },

          onPanResponderMove: (event: GestureResponderEvent, gesture: PanResponderGestureState) => {
            if (!dragActive.current) return;
            if (event.nativeEvent.touches.length > 1) return;
            if (Math.abs(gesture.dx) <= DRAG_THRESHOLD && Math.abs(gesture.dy) <= DRAG_THRESHOLD) {
              return;
            }

            const sequence = ++moveSequence.current;

            void (async () => {
              const state = latest.current;
              const coordinate = await state.resolveCoordinate({
                x: event.nativeEvent.pageX,
                y: event.nativeEvent.pageY,
              });

              // Sem coordenada o mapa ainda não mediu ou o ponto saiu da faixa;
              // o trajeto fica como está.
              if (!coordinate || !dragActive.current || sequence !== moveSequence.current) return;

              const base = dragStartGeometry.current ?? state.geometry;
              const next = moveControlPoint(base, controlIndices, index, coordinate);
              if (next === base) return;

              pending.current = next;
              state.onPreview(next);

              const movedHandles = handles.filter(
                (handle) => next[handle.index] !== base[handle.index],
              );
              const projectedHandles = await Promise.all(
                movedHandles.map(async (handle) => {
                  const moved = next[handle.index];
                  if (!moved) return [handle.index, null] as const;

                  return [handle.index, await state.projectCoordinate(moved)] as const;
                }),
              );

              if (!dragActive.current || sequence !== moveSequence.current) return;

              const points = new Map<number, ScreenPoint>();
              for (const [handleIndex, point] of projectedHandles) {
                if (point) points.set(handleIndex, point);
              }

              if (points.size > 0) {
                setPreviewHandles({ sourceHandles: handles, points });
              }

              const point = points.get(index);
              if (point) setActiveDrag({ index, point });
            })();
          },

          onPanResponderRelease: finishGesture,
          onPanResponderTerminate: finishGesture,
          onPanResponderTerminationRequest: () => false,
        });
      }),
    [handles, controlIndices, claimGesture, finishGesture],
  );

  const dragged = activeDrag;

  if (handles.length === 0) return null;

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      {handles.map((handle, position) => {
        const overriding = dragged?.index === handle.index && dragged.point !== null;
        const preview =
          previewHandles?.sourceHandles === handles
            ? previewHandles.points.get(handle.index)
            : undefined;
        const point = overriding && dragged ? dragged.point : (preview ?? handle.point);
        if (!point) return null;

        return (
          <View
            key={`handle-${handle.index}`}
            {...vertexResponders[position]?.panHandlers}
            accessible
            accessibilityRole="adjustable"
            accessibilityActions={vertexActions}
            accessibilityLabel={`${accessibilityLabel}. Ponto ${position + 1} de ${handles.length}. Arraste para movê-lo, ou use as ações para afastar ou aproximar o ponto da linha do trajeto.`}
            onAccessibilityAction={(event) => {
              if (event.nativeEvent.actionName === 'increment') {
                commitNudge(handle.index, 'out');
              }
              if (event.nativeEvent.actionName === 'decrement') {
                commitNudge(handle.index, 'in');
              }
            }}
            style={[
              styles.handle,
              { left: point.x - PATH_HANDLE_SPACING / 2, top: point.y - PATH_HANDLE_SPACING / 2 },
            ]}
            testID={`path-handle-${handle.index}`}
          >
            <View pointerEvents="none" style={styles.draw} />
          </View>
        );
      })}
    </View>
  );
}

/**
 * As duas ações do papel `adjustable`, com nome em pt-BR.
 *
 * `name` tem que ser o identificador que o evento devolve — `increment` e
 * `decrement` — e o `label` é o que o leitor de tela fala. Um `label` em
 * português com `name` em inglês é o padrão, e é o que a documentação do
 * React Native pede.
 */
const vertexActions = [
  { name: 'increment' as const, label: 'Afastar o ponto da linha' },
  { name: 'decrement' as const, label: 'Aproximar o ponto da linha' },
];

const styles = StyleSheet.create({
  handle: {
    position: 'absolute',
    width: PATH_HANDLE_SPACING,
    height: PATH_HANDLE_SPACING,
    alignItems: 'center',
    justifyContent: 'center',
  },
  draw: {
    width: HANDLE_DRAW_SIZE,
    height: HANDLE_DRAW_SIZE,
    borderRadius: HANDLE_DRAW_SIZE / 2,
    borderWidth: 2,
    borderColor: colors.white,
    backgroundColor: colors.primary,
  },
});
