import { View, type AccessibilityActionEvent } from 'react-native';

import { MapPin } from '@/components/map/map-pin';
import { colors } from '@/theme/tokens';
import type { IconName } from '@/types/icon';
import type { ScreenPoint } from '@/utils/dropCoordinate';
import {
  clampPoiMarkerScale,
  POI_MARKER_SCALE_STEP,
} from '@/utils/poiEditor';

const MARKER_TARGET_SIZE = 56;
const MARKER_HALF = MARKER_TARGET_SIZE / 2;
const SELECTION_RING_SIZE = MARKER_TARGET_SIZE + 6;
const RESIZE_HANDLE_SIZE = 14;

/** Centro da bolinha no canto inferior direito do contorno pontilhado. */
export function poiResizeHandlePoint(point: ScreenPoint, scale = 1): ScreenPoint {
  const offset = (SELECTION_RING_SIZE * scale) / (2 * Math.sqrt(2));
  return { x: point.x + offset, y: point.y + offset };
}

/** Alvo maior que o desenho visível da alça para facilitar o arraste. */
export const POI_RESIZE_HANDLE_HIT_RADIUS = 22;

export type PoiMarkerProps = {
  point: ScreenPoint;
  selected: boolean;
  label: string;
  icon: IconName;
  scale?: number;
  isDragging?: boolean;
  onResize?: (scale: number) => void;
};

/**
 * O marcador de um ponto colocado no canvas.
 *
 * É um `MapPin` (o mesmo disco do mapa de verdade, PRD §24) dentro de um alvo de
 * 56px posicionado no ponto da área. O toque **não** é deste componente: o
 * `MapCanvas` acerta o marcador em pixel (`POI_TOLERANCE_PX`) no mesmo pull do
 * gesto único do canvas, então o marcador é `pointerEvents="none"` — se ele
 * tomasse o toque, o dedo que caísse perto do ícone não arrastaria mais o mapa.
 *
 * A seleção é um anel tracejado + `accessibilityState.selected`: cor nunca vem
 * sozinha, e o leitor de tela anuncia o ponto como selecionado.
 */
export function PoiMarker({
  point,
  selected,
  label,
  icon,
  scale = 1,
  isDragging = false,
  onResize,
}: PoiMarkerProps) {
  const markerScale = clampPoiMarkerScale(scale);
  const ringSize = SELECTION_RING_SIZE * markerScale;
  const handle = poiResizeHandlePoint(point, markerScale);
  const handleLeft = MARKER_HALF + (handle.x - point.x) - RESIZE_HANDLE_SIZE / 2;
  const handleTop = MARKER_HALF + (handle.y - point.y) - RESIZE_HANDLE_SIZE / 2;
  const canResize = selected && !isDragging && onResize !== undefined;

  return (
    <View
      pointerEvents="none"
      accessible={!isDragging}
      accessibilityRole={canResize ? 'adjustable' : undefined}
      accessibilityLabel={
        canResize
          ? `${label}. Use as ações para alterar o tamanho do ícone, ou arraste a bolinha do contorno.`
          : label
      }
      accessibilityState={{ selected }}
      accessibilityActions={canResize ? markerResizeActions : undefined}
      onAccessibilityAction={(event: AccessibilityActionEvent) => {
        if (!onResize) return;
        if (event.nativeEvent.actionName === 'increment') {
          onResize(markerScale + POI_MARKER_SCALE_STEP);
        }
        if (event.nativeEvent.actionName === 'decrement') {
          onResize(markerScale - POI_MARKER_SCALE_STEP);
        }
      }}
      style={{
        position: 'absolute',
        left: point.x - MARKER_HALF,
        top: point.y - MARKER_HALF,
        width: MARKER_TARGET_SIZE,
        height: MARKER_TARGET_SIZE,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: isDragging ? 0.3 : 1,
      }}
    >
      {selected ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            width: ringSize,
            height: ringSize,
            left: MARKER_HALF - ringSize / 2,
            top: MARKER_HALF - ringSize / 2,
            borderRadius: ringSize / 2,
            borderWidth: 2,
            borderColor: colors.primary,
            borderStyle: 'dashed',
          }}
        />
      ) : null}
      {canResize ? (
        <View
          pointerEvents="none"
          style={[styles.resizeHandle, { left: handleLeft, top: handleTop }]}
        />
      ) : null}
      <View pointerEvents="none" style={{ transform: [{ scale: markerScale }] }}>
        <MapPin icon={icon} />
      </View>
    </View>
  );
}

const markerResizeActions = [
  { name: 'increment' as const, label: 'Aumentar o tamanho do ícone' },
  { name: 'decrement' as const, label: 'Diminuir o tamanho do ícone' },
];

const styles = {
  resizeHandle: {
    position: 'absolute' as const,
    width: RESIZE_HANDLE_SIZE,
    height: RESIZE_HANDLE_SIZE,
    borderRadius: RESIZE_HANDLE_SIZE / 2,
    borderWidth: 2,
    borderColor: colors.white,
    backgroundColor: colors.primary,
    shadowColor: colors.content,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
    elevation: 2,
  },
};
