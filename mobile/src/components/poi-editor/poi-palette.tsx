import { Pressable, ScrollView, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { tv } from '@/lib/tv';
import { colors } from '@/theme/tokens';
import {
  POI_KIND_META,
  POI_KIND_ORDER,
  poiLabel,
  type PoiKind,
} from '@/utils/poiEditor';

export type PoiPaletteProps = {
  /** O item armado — é ele que o toque no mapa vai colocar. */
  armedPoiKind: PoiKind | null;
  /** Armar um item. Tocar no item já armado desarma (toggle do reducer). */
  onArmPoi: (kind: PoiKind) => void;
};

/**
 * A paleta de itens do protótipo, integrada à faixa de ferramentas do mapa.
 *
 * Não há arraste da paleta: quem toca num ícone arma o tipo, e o toque seguinte
 * no mapa coloca o ponto dentro da área. Depois, o próprio marcador pode ser
 * arrastado para ajustar sua posição. Os rótulos ficam na acessibilidade.
 *
 * O rótulo vem de `POI_KIND_META`, que é a mesma fonte da paleta e dos
 * marcadores: o nome que o botão anuncia é o mesmo que o marcador anuncia.
 */
export function PoiPalette({ armedPoiKind, onArmPoi }: PoiPaletteProps) {
  const selectedLabel = armedPoiKind ? poiLabel(armedPoiKind) : null;

  return (
    <View className="rounded-lg border border-border bg-background p-1 shadow-sm">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        accessibilityLabel={
          selectedLabel
            ? `${selectedLabel} selecionado. Tipos de ponto de interesse. Deslize na horizontal para ver todos.`
            : 'Tipos de ponto de interesse. Toque para selecionar; depois toque no mapa para posicionar. Deslize na horizontal para ver todos.'
        }
      >
        <View className="flex-row gap-1">
          {POI_KIND_ORDER.map((kind) => {
            const meta = POI_KIND_META[kind];
            const selected = armedPoiKind === kind;

            return (
              <Pressable
                key={kind}
                onPress={() => onArmPoi(kind)}
                accessibilityRole="button"
                accessibilityLabel={meta.label}
                accessibilityHint="Seleciona este ponto. Depois toque dentro de uma área para posicioná-lo; quando estiver no mapa, arraste o marcador para ajustá-lo."
                accessibilityState={{ selected }}
                testID={`palette-${kind}`}
                className={paletteItemVariants({ selected })}
              >
                <Icon name={meta.icon} size={20} color={selected ? colors.white : colors.primary} />
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const paletteItemVariants = tv({
  base: 'size-11 items-center justify-center rounded-md border',
  variants: {
    selected: {
      true: 'border-primary bg-primary',
      false: 'border-border bg-surface',
    },
  },
  defaultVariants: {
    selected: false,
  },
});
