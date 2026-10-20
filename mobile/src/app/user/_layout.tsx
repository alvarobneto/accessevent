import { router, Stack } from 'expo-router';

import { HeaderActions, HeaderBackButton } from '@/components/header-actions';
import { IconButton } from '@/components/ui';
import { headerTheme } from '@/theme/tokens';

export default function UserLayout() {
  return (
    <Stack
      screenOptions={{
        ...headerTheme,
        headerBackVisible: false,
        headerLeft: (props) => <HeaderBackButton canGoBack={props.canGoBack} />,
        headerLargeTitle: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="categories/index" options={{ title: 'Categorias' }} />
      <Stack.Screen name="categories/[category]" options={{ title: 'Categoria' }} />
      <Stack.Screen name="event/[eventId]/index" options={{ title: 'Navegações' }} />
      <Stack.Screen name="event/[eventId]/details" options={{ title: 'Detalhes do evento' }} />
      <Stack.Screen
        name="map/[mapId]"
        options={{
          title: 'Mapa',
          // A tela atualiza estas opções durante o toque no mapa, deixando o
          // gesto de voltar funcionar no restante da interface.
          gestureEnabled: false,
        }}
      />
      <Stack.Screen name="map/[mapId]/details" options={{ title: 'Detalhes do mapa' }} />
      <Stack.Screen
        name="map/exemplo/index"
        options={{
          title: 'Navegação acessível',
          gestureEnabled: true,
          fullScreenGestureEnabled: true,
          headerRight: () => (
            <HeaderActions>
              <IconButton
                icon="dots-vertical"
                accessibilityLabel="Detalhes do mapa"
                onPress={() => router.push('/user/map/exemplo/details')}
              />
            </HeaderActions>
          ),
        }}
      />
      <Stack.Screen name="map/exemplo/details" options={{ title: 'Detalhes do mapa' }} />
    </Stack>
  );
}
