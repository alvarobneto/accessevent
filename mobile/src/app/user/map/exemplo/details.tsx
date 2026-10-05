import { router } from 'expo-router';
import { View, Pressable } from 'react-native';

import { Screen } from '@/components/screen';
import { Text, Button } from '@/components/ui';

export default function MapaExemploDetailsScreen() {
  return (
    <Screen scrollable contentClassName="gap-4 px-5 pb-8 pt-6">
      <View className="flex-row items-center justify-between">
        <Pressable
          onPress={() => router.back()}
          className="h-10 w-10 items-center justify-center rounded-xl bg-gray-100"
        >
          <Text variant="heading">‹</Text>
        </Pressable>
        <Text variant="heading">Detalhes do mapa</Text>
        <View className="w-10" />
      </View>
      <Text variant="body" tint="muted">
        Informações sobre acessibilidade, pontos de interesse e dados fornecidos pelo organizador.
      </Text>
      <Button label="Voltar ao mapa" onPress={() => router.back()} fullWidth />
    </Screen>
  );
}
