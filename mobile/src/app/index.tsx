import { router } from 'expo-router';
import { View } from 'react-native';

import { Screen } from '@/components/screen';
import { Icon, SelectCard, Text } from '@/components/ui';
import { colors } from '@/theme/tokens';

/**
 * Tela inicial: escolhe o modo de uso e abre a área correspondente. Não existe
 * login — a escolha define apenas para onde o app navega.
 */
export default function RoleSelectionScreen() {
  return (
    <Screen scrollable contentClassName="gap-6 px-5 pb-10 pt-12" testID="role-selection-screen">
      <View>
        <View className="size-14 items-center justify-center rounded-xl bg-primary">
          <Icon name="human-wheelchair" size={32} color={colors.background} />
        </View>

        <Text variant="display" className="mt-6">
          AccessEvent
        </Text>
        <Text variant="callout" className="mt-2 max-w-sm">
          Mapas de acessibilidade de eventos, informados por quem organiza.
        </Text>
      </View>

      <View className="gap-4">
        <SelectCard
          icon={<Icon name="account-hard-hat-outline" size={24} color={colors.primary} />}
          title="Eu sou organizador"
          description="Crie eventos, prepare as navegações e informe as características de acessibilidade."
          onPress={() => router.replace('/organizer')}
          testID="enter-organizer"
        />

        <SelectCard
          icon={<Icon name="human-wheelchair" size={24} color={colors.primary} />}
          title="Eu sou usuário"
          description="Consulte os mapas do evento e os caminhos disponíveis dentro deles."
          onPress={() => router.replace('/user')}
          testID="enter-user"
        />
      </View>

      <Text variant="caption">
        Protótipo: os dados ficam apenas na memória do aplicativo e são apagados quando o app fecha.
      </Text>
    </Screen>
  );
}
