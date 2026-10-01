import { DetailRow } from '@/components/detail-row';
import { Section } from '@/components/section';
import { Card, Text } from '@/components/ui';
import type { Event } from '@/data';
import { formatDate, formatDateRange } from '@/utils/format';

/**
 * Conteúdo das telas de detalhes do evento, uma no organizador e outra no
 * participante.
 *
 * As duas mostram exatamente os mesmos dados — o que muda é o que cada modo pode
 * fazer com eles, e isso mora no menu do cabeçalho, não aqui. Por isso a tela
 * inteira é este componente e as rotas só diferem no cabeçalho e no destino de
 * "voltar".
 */
export function EventDetailsView({ event }: { event: Event }) {
  return (
    <>
      <Card>
        <Text variant="heading">{event.name}</Text>

        <Text variant="body">
          {event.description || 'O organizador não escreveu uma descrição para este evento.'}
        </Text>
      </Card>

      <Section title="Informações">
        <Card variant="soft">
          <DetailRow
            label="Período"
            value={formatDateRange(event.startDate, event.endDate) ?? 'Não informado'}
          />
          <DetailRow label="Endereço" value={event.address ?? 'Não informado'} />
          <DetailRow label="Criado em" value={formatDate(event.createdAt)} />
          <DetailRow label="Atualizado em" value={formatDate(event.updatedAt)} />
        </Card>
      </Section>

      <Text variant="caption">
        As informações de acessibilidade são fornecidas pelo organizador e não são verificadas
        automaticamente pelo aplicativo.
      </Text>
    </>
  );
}
