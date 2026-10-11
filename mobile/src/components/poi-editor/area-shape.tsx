import { View } from 'react-native';
import { Polygon } from 'react-native-svg';

import { colors } from '@/theme/tokens';
import type { ScreenPoint } from '@/utils/dropCoordinate';

/** O círculo desenhado de cada alça de vértice. */
const HANDLE_DRAW_SIZE = 16;

/** O alvo de toque da alça: o piso de 44px cabe a mão e o `MapCanvas` acerta nele. */
const HANDLE_TARGET_SIZE = 44;

export type AreaShapeProps = {
  /** O anel projetado em pixel (ver `mapToScreen`). */
  points: ScreenPoint[];
  selected: boolean;
  /** `true` enquanto o desenho ainda não foi confirmado (arrasto, preview). */
  preview?: boolean;
  id: string;
  label: string;
};

/**
 * Uma área desenhada no `<Svg>` do canvas.
 *
 * A cor é sí a forma: preenchimento `primary50` e traço `primary300` para
 * qualquer área, `primary200`/`primary` e traço tracejado para a selecionada.
 * Cor nunca vem sozinha (acessor de contraste da sprint anterior): o traço
 * tracejado, as alças de vértice e a legenda do leitor de tela acompanham a cor
 * da seleção.
 */
export function AreaShape({ points, selected, preview = false }: AreaShapeProps) {
  if (points.length < 2) return null;

  return (
    <Polygon
      points={points.map((point) => `${point.x},${point.y}`).join(' ')}
      fill={selected ? colors.primary200 : colors.primary50}
      fillOpacity={selected ? 0.85 : 0.6}
      stroke={selected ? colors.primary : colors.primary300}
      strokeWidth={selected ? 3 : 2}
      strokeDasharray={preview ? '8 5' : selected ? '8 5' : undefined}
      strokeLinejoin="round"
    />
  );
}

export type VertexHandlesProps = {
  /** Os vértices do anel da área selecionada, projetados em pixel. */
  points: ScreenPoint[];
  label: string;
};

/**
 * As alças de vértice da área selecionada.
 *
 * São **só desenho** — o toque é do `MapCanvas`, que decide no `grant` se o dedo
 * caiu dentro da tolerância de um vértice e vira edição. A alça é um círculo de
 * 16px dentro de um alvo de 44px (`HANDLE_TARGET_SIZE`), o piso de toque do
 * `design.md`; quem quisesse usar a alça como alvo de toque de verdade teria que
 * dar a ela um `PanResponder` próprio, e aí o arraste do mapa e o da alça
 * brigariam pela resposta no primeiro frame do gesto.
 */
export function VertexHandles({ points, label }: VertexHandlesProps) {
  if (points.length < 3) return null;

  return (
    <>
      {points.map((point, index) => {
        const left = point.x - HANDLE_TARGET_SIZE / 2;
        const top = point.y - HANDLE_TARGET_SIZE / 2;

        return (
          <View
            key={index}
            pointerEvents="none"
            accessible
            accessibilityLabel={`${label}. Vértice ${index + 1}`}
            style={{ position: 'absolute', left, top, width: HANDLE_TARGET_SIZE, height: HANDLE_TARGET_SIZE, alignItems: 'center', justifyContent: 'center' }}
          >
            <View
              pointerEvents="none"
              style={{
                width: HANDLE_DRAW_SIZE,
                height: HANDLE_DRAW_SIZE,
                borderRadius: HANDLE_DRAW_SIZE / 2,
                backgroundColor: colors.surface,
                borderWidth: 3,
                borderColor: colors.primary,
              }}
            />
          </View>
        );
      })}
    </>
  );
}