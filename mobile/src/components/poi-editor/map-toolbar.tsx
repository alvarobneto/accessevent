import { Pressable, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { tv } from '@/lib/tv';
import { colors } from '@/theme/tokens';
import type { IconName } from '@/types/icon';
import type { ActiveTool } from '@/utils/poiEditor';

export type MapToolbarProps = {
  /** A ferramenta de desenho armada; `none` quando nenhuma. */
  activeTool: ActiveTool;
  /** Desligado quando o histórico de desenho está vazio. */
  canUndo: boolean;
  onSelectTool: (tool: ActiveTool) => void;
  onUndo: () => void;
};

/**
 * As ferramentas de desenho do editor.
 *
 * Controles compactos sobre o mapa. Os rótulos continuam disponíveis para leitor
 * de tela; visualmente, os ícones deixam o desenho livre de botões largos e texto.
 * Mover uma área ou editar vértices continua sendo gesto direto no desenho.
 */
export function MapToolbar({ activeTool, canUndo, onSelectTool, onUndo }: MapToolbarProps) {
  return (
    <View className="flex-row gap-1 rounded-lg border border-border bg-background p-1 shadow-sm">
      {TOOLS.map((tool) => {
        const selected = activeTool === tool.tool;

        return (
          <Pressable
            key={tool.tool}
            onPress={() => onSelectTool(tool.tool)}
            accessibilityRole="button"
            accessibilityLabel={tool.label}
            accessibilityHint={tool.hint}
            accessibilityState={{ selected }}
            testID={`tool-${tool.tool}`}
            className={toolVariants({ selected })}
          >
            <Icon name={tool.icon} size={20} color={selected ? colors.white : colors.primary} />
          </Pressable>
        );
      })}

      <Pressable
        onPress={onUndo}
        disabled={!canUndo}
        accessibilityRole="button"
        accessibilityLabel="Desfazer último passo do desenho"
        accessibilityHint="Remove a última forma ou alteração feita."
        accessibilityState={{ disabled: !canUndo }}
        testID="tool-undo"
        className={undoVariants({ disabled: !canUndo })}
      >
        <Icon name="undo" size={20} color={canUndo ? colors.primary : colors.gray400} />
      </Pressable>
    </View>
  );
}

/** O par de ferramentas de desenho, na ordem em que a barra mostra. */
const TOOLS: readonly {
  tool: Exclude<ActiveTool, 'none'>;
  icon: IconName;
  label: string;
  hint: string;
}[] = [
  {
    tool: 'rectangle',
    icon: 'square',
    label: 'Cômodo',
    hint: 'Toque para criar um quadrado ou arraste para desenhar um retângulo.',
  },
  {
    tool: 'freehand',
    icon: 'pencil',
    label: 'Desenho livre',
    hint: 'Arraste pelo mapa para desenhar uma área livre.',
  },
];

const toolVariants = tv({
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

const undoVariants = tv({
  base: 'size-11 items-center justify-center rounded-md border',
  variants: {
    disabled: {
      true: 'border-border bg-gray-50',
      false: 'border-border bg-surface',
    },
  },
  defaultVariants: {
    disabled: false,
  },
});
