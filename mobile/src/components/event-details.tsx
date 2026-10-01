import { View } from 'react-native';

import { Text } from '@/components/ui';
import type { Event } from '@/data';
import { formatDate, formatIsoDate } from '@/utils/format';

/** Linhas curtas com o que o organizador informou, pulando o que ficou vazio. */
function buildDetails(event: Event): string[] {
  const details: string[] = [];
  const start = formatIsoDate(event.startDate);
  const end = formatIsoDate(event.endDate);

  if (start && end) details.push(`${start} a ${end}`);
  else if (start) details.push(`Começa em ${start}`);
  else if (end) details.push(`Termina em ${end}`);

  if (event.address) details.push(event.address);
  details.push(`Criado em ${formatDate(event.createdAt)}`);

  return details;
}

/**
 * Resumo de um evento, compartilhado por "Gerenciar evento" e pela tela de
 * consulta do participante. As duas telas mostram os mesmos dados, então a
 * formatação mora em um lugar só.
 */
export function EventDetails({ event }: { event: Event }) {
  return (
    <View className="gap-1">
      <Text variant="caption">{event.description || 'Sem descrição.'}</Text>

      {buildDetails(event).map((detail, index) => (
        <Text key={index} variant="caption" tint="muted">
          {detail}
        </Text>
      ))}
    </View>
  );
}
