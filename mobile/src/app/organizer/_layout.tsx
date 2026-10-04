import { Stack } from 'expo-router';
import { Platform } from 'react-native';

import { HeaderActions, HeaderBackButton } from '@/components/header-actions';
import { headerTheme } from '@/theme/tokens';

/**
 * Área do organizador.
 *
 * O cabeçalho usa o padrão de apps de produtividade: título grande no topo
 * (iOS), fundo da mesma cor da tela, sem sombra, botão de voltar próprio à
 * esquerda e troca de modo à direita.
 */
export default function OrganizerLayout() {
  return (
    <Stack
      screenOptions={{
        ...headerTheme,
        headerBackVisible: false,
        headerLeft: (props) => <HeaderBackButton canGoBack={props.canGoBack} />,
        headerRight: () => <HeaderActions />,
        headerLargeTitle: Platform.OS === 'ios',
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Eventos',
          headerLargeTitle: Platform.OS === 'ios',
          headerLeft: () => null,
        }}
      />
      <Stack.Screen name="event/new" options={{ title: 'Novo evento' }} />
      <Stack.Screen name="event/[eventId]/index" options={{ title: 'Gerenciar evento' }} />
      <Stack.Screen name="event/[eventId]/details" options={{ title: 'Detalhes do evento' }} />
      <Stack.Screen name="event/[eventId]/edit" options={{ title: 'Editar evento' }} />
      <Stack.Screen name="event/[eventId]/map/new" options={{ title: 'Nova navegação' }} />
      <Stack.Screen name="event/[eventId]/map/[mapId]" options={{ title: 'Gerenciar navegação' }} />
      <Stack.Screen
        name="event/[eventId]/map/[mapId]/record"
        options={{ title: 'Mapear novo caminho' }}
      />
      <Stack.Screen
        name="event/[eventId]/map/[mapId]/details"
        options={{ title: 'Detalhes da navegação' }}
      />
      <Stack.Screen name="map/[mapId]" options={{ title: 'Editar navegação' }} />
    </Stack>
  );
}
