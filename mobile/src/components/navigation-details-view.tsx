import { DetailRow } from '@/components/detail-row';
import { Section } from '@/components/section';
import { Card, Text } from '@/components/ui';
import type { NavigationMap } from '@/data';
import { formatDate } from '@/utils/format';

/**
 * Conteúdo das telas de detalhes da navegação, uma no organizador e outra no
 * participante. Mesma divisão do `EventDetailsView`: o que o organizador
 * informou fica num bloco, e a data da última atualização fica à vista porque é
 * ela que diz há quanto tempo os dados do mapa valem.
 */
export function NavigationDetailsView({ map }: { map: NavigationMap }) {
  return (
    <>
      <Card>
        <Text variant="heading">{map.name}</Text>

        <Text variant="caption" tint="muted">
          Os pontos de interesse e os caminhos entre eles aparecem no mapa.
        </Text>
      </Card>

      <Section title="Informações">
        <Card variant="soft">
          <DetailRow label="Criada em" value={formatDate(map.createdAt)} />
          <DetailRow label="Atualizada em" value={formatDate(map.updatedAt)} />
        </Card>
      </Section>

      <Text variant="caption">
        As informações de acessibilidade são fornecidas pelo organizador e não são verificadas
        automaticamente pelo aplicativo.
      </Text>
    </>
  );
}
