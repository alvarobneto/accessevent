import { View } from 'react-native';

import { IconButton } from '@/components/ui';

export type MapActionsProps = {
  /** Desliga "Centralizar" quando ainda não há o que enquadrar. */
  canFit: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
};

/**
 * Controles flutuantes do mapa: zoom e centralização.
 *
 * O zoom tem duas portas — puxar com dois dedos no canvas **e** estes botões —
 * porque toque pode, e acessibilidade não: quem usa leitor de tela ou controle por
 * toque não tem gesto de pinça, e o botão é o caminho (RNF04).
 *
 * Apagar não fica junto dos controles de câmera: a ação irreversível aparece ao
 * lado do estado da seleção e sempre pede confirmação num `Dialog` destrutivo.
 */
export function MapActions({ canFit, onZoomIn, onZoomOut, onFit }: MapActionsProps) {
  return (
    <View className="flex-row gap-1 rounded-lg border border-border bg-background p-1 shadow-sm">
      <IconButton
        icon="plus"
        size="sm"
        accessibilityLabel="Aumentar o mapa"
        onPress={onZoomIn}
        testID="map-zoom-in"
      />
      <IconButton
        icon="minus"
        size="sm"
        accessibilityLabel="Reduzir o mapa"
        onPress={onZoomOut}
        testID="map-zoom-out"
      />
      <IconButton
        icon="crosshairs-gps"
        size="sm"
        accessibilityLabel="Centralizar o desenho no mapa"
        disabled={!canFit}
        onPress={onFit}
        testID="map-fit"
      />
    </View>
  );
}
