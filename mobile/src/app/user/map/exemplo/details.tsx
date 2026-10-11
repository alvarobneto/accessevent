import { Screen } from '@/components/screen';
import { Text } from '@/components/ui';

export default function MapaExemploDetailsScreen() {
  return (
    <Screen scrollable contentClassName="gap-4 px-5 pb-8 pt-6">
      <Text variant="body" tint="muted">
        Informações sobre acessibilidade, pontos de interesse e dados fornecidos pelo organizador.
      </Text>
    </Screen>
  );
}
