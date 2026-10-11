import { useCallback, useMemo } from 'react';
import {
  PanResponder,
  StyleSheet,
  View,
  type GestureResponderEvent,
  type PanResponderGestureState,
} from 'react-native';

import { colors } from '@/theme/tokens';
import type { Coordinate } from '@/types/coordinates';
import type { ScreenPoint } from '@/utils/dropCoordinate';
import {
  resizeRect,
  resizeRectByStep,
  type PoiRect,
  type PoiRectCorner,
  type PoiResizeDirection,
} from '@/utils/poiAnchor';

/**
 * Lado da alça de canto, em pixels.
 *
 * O desenho é o quadrado menor; o alvo de toque é este `size-11`, o piso de 44px
 * do `design.md`. São 44px de alvo com 16px de desenho porque a alça fica em cima
 * do mapa, onde qualquer coisa menor que isso seria difícil de acertar sem
 * ajuda de um dedo firme — e é o gesto que define o tamanho da marcação.
 */
const HANDLE_SIZE = 44;

const HANDLE_DRAW_SIZE = 16;

/**
 * Distância, em pixels, a partir da qual o toque na alça vira arrasto.
 *
 * O mesmo valor da paleta (`DRAG_THRESHOLD`): abaixo dele ninguém toma o gesto e
 * o toque passa, acima dele quem arrasta é a alça. Compartilhar a constant é
 * proposital — os dois gestos discriminam toque de arrasto pelo mesmo critério, e
 * dois limiares diferentes fariam o mesmo dedo se comportar de jeito diferente em
 * dois lugares da mesma tela.
 */
const DRAG_THRESHOLD = 24;

const CORNERS: PoiRectCorner[] = ['northWest', 'northEast', 'southEast', 'southWest'];

export type RectHandleOverlayProps = {
  /** Retângulo em edição, com os cantos já projetados em pixels do mapa. */
  points: Record<PoiRectCorner, ScreenPoint> | null;
  rect: PoiRect;
  /** Converte o ponto de arraste em coordenada, ou `null` se não dá. */
  resolveCoordinate: (point: ScreenPoint) => Promise<Coordinate | null>;
  onResize: (rect: PoiRect) => void;
  /** Rótulo do retângulo para o leitor de tela; as alças entram nele. */
  accessibilityLabel: string;
};

/**
 * As quatro alças de canto do retângulo em edição.
 *
 * **Por que as alças são `View`s por cima do mapa e não parte do `Polygon`.** O
 * `Polygon` do `react-native-maps` é desenhado pela plataforma e não aceita toque
 * nem posição em pixel: ele vive em coordenadas geográficas, que é exatamente o
 * que ele deve fazer. Uma alça de canto precisa estar *no pixel onde o canto
 * aparece agora*, e esse pixel muda a cada zoom e a cada pan da câmera — é a
 * projeção que `pointForCoordinate` faz, e ela só existe na biblioteca. Então a
 * caixa é desenhada geograficamente pelo `Polygon`, e as alças são uma camada de
 * interação por cima, reposicionada quando a câmera se mexe.
 *
 * A divisão é o que evita o bug do retângulo guardado em pixels: nada aqui é
 * gravado, e a caixa continua sendo a mesma coordenada antes e depois do zoom.
 *
 * **O arraste usa a mesma conversão do toque no mapa**, `resolveCoordinate`: o
 * gesto entrega `pageX`/`pageY`, e quem converte é o `EventMap`, que é quem sabe
 * onde o mapa está na janela. A alça não conhece `MapView`.
 */
export function RectHandleOverlay({
  points,
  rect,
  resolveCoordinate,
  onResize,
  accessibilityLabel,
}: RectHandleOverlayProps) {
  /**
   * Cada `move` compõe com o retângulo que **chegou naquele render**, e não com o
   * resultado do `move` anterior.
   *
   * Isso não acumula porque `resizeRect` põe o canto arrastado na coordenada do
   * dedo de forma absoluta: partir do retângulo anterior daria exatamente o mesmo
   * resultado que partir do começo do gesto. Se alguma vez `resizeRect` passar a
   * somar em vez de substituir, aí sim a composição por render vira um laço que
   * sai do lugar — e é por isso que o teste do utilitário fixa a substituição por
   * coordenada, não por delta.
   */
  const handleDrag = useCallback(
    (corner: PoiRectCorner) =>
      PanResponder.create({
        // Mesmo desenho da paleta: quem toma o gesto é o `move`, e só depois do
        // limiar, para o toque simples não virar arraste.
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (
          _event: GestureResponderEvent,
          gesture: PanResponderGestureState,
        ) => Math.abs(gesture.dx) > DRAG_THRESHOLD || Math.abs(gesture.dy) > DRAG_THRESHOLD,

        onPanResponderMove: (event: GestureResponderEvent) => {
          void (async () => {
            const coordinate = await resolveCoordinate({
              x: event.nativeEvent.pageX,
              y: event.nativeEvent.pageY,
            });

            // `null` é o mapa ainda sem tamanho ou região: sem coordenada não há
            // canto novo, e o retângulo fica como está — que é a resposta certa
            // para "ainda não dá para arrastar".
            if (!coordinate) return;

            onResize(resizeRect(rect, corner, coordinate));
          })();
        },

        onPanResponderTerminationRequest: () => false,
      }),
    [onResize, rect, resolveCoordinate],
  );

  const responders = useMemo(
    () => ({
      northWest: handleDrag('northWest'),
      northEast: handleDrag('northEast'),
      southEast: handleDrag('southEast'),
      southWest: handleDrag('southWest'),
    }),
    [handleDrag],
  );

  /**
   * Redimensiona um passo, para quem não arrasta.
   *
   * O papel `adjustable` sem `onAccessibilityAction` é um botão morto no leitor de
   * tela: o iOS e o Android anunciam "ajustável" e duas ações, e nenhuma das duas
   * faz nada. `increment`/`decrement` são o par nativo de "aumentar"/"diminuir", e
   * `resizeRectByStep` faz a conta sem coordenada — quem ouve não tem
   * `pageX`/`pageY`, então o caminho do pixel não existe para essa pessoa.
   */
  const handleAdjust = useCallback(
    (corner: PoiRectCorner, direction: PoiResizeDirection) => () => {
      onResize(resizeRectByStep(rect, corner, direction));
    },
    [onResize, rect],
  );

  if (!points) return null;

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      {CORNERS.map((corner) => (
        <View
          key={corner}
          {...responders[corner].panHandlers}
          accessible
          accessibilityRole="adjustable"
          accessibilityActions={RESIZE_ACTIONS}
          onAccessibilityAction={(event) => {
            if (event.nativeEvent.actionName === 'increment') handleAdjust(corner, 'grow')();
            if (event.nativeEvent.actionName === 'decrement') handleAdjust(corner, 'shrink')();
          }}
          accessibilityLabel={`${accessibilityLabel}. Alça do canto ${CORNER_LABELS[corner]}. Arraste para mudar o tamanho da marcação, ou use as ações de aumentar e diminuir.`}
          style={[styles.handle, { left: points[corner].x - HANDLE_SIZE / 2, top: points[corner].y - HANDLE_SIZE / 2 }]}
          testID={`rect-handle-${corner}`}
        >
          <View pointerEvents="none" style={styles.draw} />
        </View>
      ))}
    </View>
  );
}

/**
 * As duas ações do papel `adjustable`, com nome em pt-BR.
 *
 * `name` tem que ser o identificador que o evento devolve — `increment` e
 * `decrement` — e o `label` é o que o leitor de tela fala. Um `label` em português
 * com `name` em inglês é o padrão, e é o que a documentação do React Native pede.
 */
const RESIZE_ACTIONS = [
  { name: 'increment' as const, label: 'Aumentar a marcação' },
  { name: 'decrement' as const, label: 'Diminuir a marcação' },
];

/** Nome do canto em pt-BR, para o leitor de tela. */
const CORNER_LABELS: Record<PoiRectCorner, string> = {
  northWest: 'noroeste',
  northEast: 'nordeste',
  southEast: 'sudeste',
  southWest: 'sudoeste',
};

const styles = StyleSheet.create({
  handle: {
    position: 'absolute',
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
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
