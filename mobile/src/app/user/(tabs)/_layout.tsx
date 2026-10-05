import { Tabs } from 'expo-router';

import { Icon } from '@/components/ui';
import { colors } from '@/theme/tokens';

export default function UserTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.gray400,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
        },
        tabBarLabelStyle: {
          fontSize: 14,
          fontWeight: '500',
        },
      }}
    >
      <Tabs.Screen
        name="explorar"
        options={{
          title: 'Explorar',
          tabBarIcon: ({ color }) => <Icon name="home-outline" size={20} color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="mapa"
        options={{
          title: 'Mapa',
          tabBarIcon: ({ color }) => <Icon name="map-outline" size={20} color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="favoritos"
        options={{
          title: 'Favoritos',
          tabBarIcon: ({ color }) => (
            <Icon name="heart-outline" size={20} color={color as string} />
          ),
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color }) => (
            <Icon name="account-outline" size={20} color={color as string} />
          ),
        }}
      />
    </Tabs>
  );
}
