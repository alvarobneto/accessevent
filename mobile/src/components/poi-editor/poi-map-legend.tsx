import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Card, Icon, Text } from '@/components/ui';
import { colors } from '@/theme/tokens';
import type { IconName } from '@/types/icon';
import { POI_KIND_META, POI_KIND_ORDER, poiLabel, type PoiKind } from '@/utils/poiEditor';

const POI_MEANINGS: Record<PoiKind, string> = {
  entrance: 'Acesso para entrar no local.',
  exit: 'Saída do local.',
  bathroom: 'Banheiro indicado no mapa.',
  stairs: 'Acesso vertical por escada.',
  elevator: 'Acesso vertical por elevador.',
  reception: 'Atendimento ou informações.',
  accessibility: 'Recurso indicado pelo organizador.',
};

const MAP_TOOLS: readonly { icon: IconName; label: string; meaning: string }[] = [
  { icon: 'square', label: 'Desenhar área', meaning: 'Toque para criar um retângulo ou arraste.' },
  { icon: 'pencil', label: 'Desenho livre', meaning: 'Arraste para traçar uma área.' },
  { icon: 'undo', label: 'Desfazer', meaning: 'Reverte a última edição.' },
  { icon: 'plus', label: 'Aumentar', meaning: 'Aproxima o mapa.' },
  { icon: 'minus', label: 'Reduzir', meaning: 'Afasta o mapa.' },
  { icon: 'crosshairs-gps', label: 'Centralizar', meaning: 'Enquadra o desenho no mapa.' },
];

/** Legenda dos símbolos e ferramentas visíveis sobre o mapa. */
export function PoiMapLegend() {
  return (
    <Card
      title="Legenda do mapa"
      subtitle="Os pontos representam informações marcadas pelo organizador."
      testID="poi-map-legend"
    >
      <LegendGroup title="Pontos de interesse">
        {POI_KIND_ORDER.map((kind) => (
          <LegendEntry
            key={kind}
            icon={POI_KIND_META[kind].icon}
            label={poiLabel(kind)}
            meaning={POI_MEANINGS[kind]}
          />
        ))}
      </LegendGroup>

      <LegendGroup title="Ferramentas do mapa">
        {MAP_TOOLS.map((tool) => (
          <LegendEntry key={tool.icon} {...tool} />
        ))}
      </LegendGroup>
    </Card>
  );
}

function LegendGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="gap-2">
      <Text variant="label">{title}</Text>
      <View className="flex-row flex-wrap">{children}</View>
    </View>
  );
}

function LegendEntry({
  icon,
  label,
  meaning,
}: {
  icon: IconName;
  label: string;
  meaning: string;
}) {
  return (
    <View className="w-1/2 flex-row items-start gap-2 px-1 py-2">
      <View className="size-10 items-center justify-center rounded-md bg-primary-50">
        <Icon name={icon} size={20} color={colors.primary} />
      </View>
      <View className="flex-1 gap-1">
        <Text variant="caption" className="font-semibold" numberOfLines={1}>
          {label}
        </Text>
        <Text variant="caption" tint="muted">
          {meaning}
        </Text>
      </View>
    </View>
  );
}
