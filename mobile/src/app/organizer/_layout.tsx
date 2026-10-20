import { Stack } from 'expo-router';

import { HeaderBackButton } from '@/components/header-actions';
import { headerTheme } from '@/theme/tokens';

/**
 * Área do organizador.
 *
 * O cabeçalho usa o padrão de apps de produtividade: título grande no topo
 * (iOS), fundo da mesma cor da tela, sem sombra e botão de voltar próprio à
 * esquerda. Ações contextuais são declaradas apenas pelas telas que as possuem.
 */
export default function OrganizerLayout() {
  return (
    <Stack
      screenOptions={{
        ...headerTheme,
        headerShown: true,
        headerBackVisible: false,
        headerLeft: (props) => <HeaderBackButton canGoBack={props.canGoBack} />,
        headerLargeTitle: false,
        animation: 'slide_from_right',
        // O gesto fica desativado por padrão. As telas com mapa substituem esta
        // opção via `useMapGestureNavigation`: habilitam o voltar fora do canvas
        // e o suspendem enquanto há toque/arraste no mapa.
        gestureEnabled: false,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Eventos',
          headerLargeTitle: false,
          headerLeft: () => null,
        }}
      />
      <Stack.Screen name="event/new" options={{ title: 'Novo evento' }} />
      <Stack.Screen name="event/[eventId]/index" options={{ title: 'Gerenciar evento' }} />
      <Stack.Screen name="event/[eventId]/details" options={{ title: 'Detalhes do evento' }} />
      <Stack.Screen name="event/[eventId]/edit" options={{ title: 'Editar evento' }} />
      <Stack.Screen name="event/[eventId]/map/new" options={{ title: 'Nova navegação' }} />
      <Stack.Screen
        name="event/[eventId]/map/[mapId]"
        options={{
          title: 'Gerenciar navegação',
          // O `EventMap` do hub é arrastável: o gesto de voltar do iOS (borda
          // esquerda) disputaria o toque com o pan do mapa. Desligado — o voltar
          // continua pelo botão do header.
          gestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="event/[eventId]/map/[mapId]/record"
        options={{
          title: 'Mapear novo caminho',
          gestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="event/[eventId]/map/[mapId]/edit"
        options={{ title: 'Editar navegação' }}
      />
      <Stack.Screen
        name="event/[eventId]/map/[mapId]/adjust"
        options={{ title: 'Ajustar rotas', gestureEnabled: false }}
      />
      <Stack.Screen
        name="event/[eventId]/map/[mapId]/path/[pathId]/adjust"
        options={{
          title: 'Ajustar trajeto',
          // O `EventMap` é arrastável e a tela é toda dele: o gesto de voltar do
          // iOS (borda esquerda) disputaria o toque com o pan do mapa, como nas
          // outras rotas de mapa da área do organizador.
          gestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="event/[eventId]/map/[mapId]/details"
        options={{ title: 'Detalhes da navegação' }}
      />
      <Stack.Screen
        name="event/[eventId]/map/[mapId]/poi/[poiId]"
        options={{
          title: 'Editar ponto',
          gestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="event/[eventId]/map/[mapId]/areas"
        options={{
          title: 'Áreas do mapa',
          // O `MapCanvas` é arrastável em todos os sentidos: o gesto de voltar do
          // iOS (borda esquerda) disputaria o toque com o desenho. Desligado aqui,
          // no registro estático; a tela reativa o gesto fora do mapa via
          // `useMapGestureNavigation`.
          gestureEnabled: false,
        }}
      />
    </Stack>
  );
}
