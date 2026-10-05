import { Stack } from 'expo-router';
import { Platform } from 'react-native';

import { HeaderActions, HeaderBackButton } from '@/components/header-actions';
import { headerTheme } from '@/theme/tokens';

export default function UserLayout() {
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
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="categories/index" options={{ title: 'Categorias' }} />
      <Stack.Screen name="categories/[category]" options={{ title: 'Categoria' }} />
      <Stack.Screen name="event/[eventId]/index" options={{ title: 'Navegações' }} />
      <Stack.Screen name="event/[eventId]/details" options={{ title: 'Detalhes do evento' }} />
      <Stack.Screen name="map/[mapId]" options={{ title: 'Mapa' }} />
      <Stack.Screen name="map/[mapId]/details" options={{ title: 'Detalhes do mapa' }} />
      <Stack.Screen name="map/exemplo/index" options={{ headerShown: false }} />
      <Stack.Screen name="map/exemplo/details" options={{ title: 'Detalhes do mapa' }} />
    </Stack>
  );
}
