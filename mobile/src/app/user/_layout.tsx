import { Stack } from 'expo-router';
import { Platform } from 'react-native';

import { HeaderBackButton, HeaderModeButton } from '@/components/header-actions';
import { headerTheme } from '@/theme/tokens';

/**
 * Área de consulta do usuário. Mesmo padrão de cabeçalho da área do organizador:
 * voltar à esquerda e troca de modo à direita.
 */
export default function UserLayout() {
  return (
    <Stack
      screenOptions={{
        ...headerTheme,
        headerBackVisible: false,
        headerLeft: (props) => <HeaderBackButton canGoBack={props.canGoBack} />,
        headerRight: () => <HeaderModeButton />,
        headerLargeTitle: Platform.OS === 'ios',
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Eventos', headerLeft: () => null }} />
      <Stack.Screen name="event/[eventId]/index" options={{ title: 'Navegações' }} />
      <Stack.Screen name="map/[mapId]" options={{ title: 'Mapa' }} />
    </Stack>
  );
}
