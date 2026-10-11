import { router } from 'expo-router';
import { View } from 'react-native';

import { Screen } from '@/components/screen';
import { Text, Card, Icon, ListRow } from '@/components/ui';
import { colors } from '@/theme/tokens';
import { clearSession } from '@/services/authStorage';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAsyncData } from '@/hooks/useAsyncData';
import { useFavorites } from '@/hooks/useFavorites';
import { useRefreshOnFocus } from '@/hooks/useRefreshOnFocus';
import { repository } from '@/data';

export default function PerfilTab() {
  const { user } = useCurrentUser();
  const { favorites } = useFavorites();

  const {
    state: routesState,
    reload: reloadRoutes,
    refreshing,
  } = useAsyncData(async () => {
    const events = await repository.listEvents();
    const mapLists = await Promise.all(
      events.map((e) => repository.listNavigationMaps(e.id).catch(() => [])),
    );
    return mapLists.reduce((total, maps) => total + maps.length, 0);
  });

  useRefreshOnFocus(reloadRoutes);

  const routesCount = routesState.status === 'success' ? routesState.data : 0;

  const fullName =
    user?.firstName || user?.lastName
      ? `${user?.firstName || ''} ${user?.lastName || ''}`.trim()
      : user?.email || 'Visitante';

  const avatarLetter = (user?.firstName?.[0] || user?.email?.[0] || 'V').toUpperCase();

  async function handleLogout() {
    await clearSession();
    router.replace('/splash');
  }

  return (
    <Screen
      scrollable
      onRefresh={reloadRoutes}
      refreshing={refreshing}
      contentClassName="gap-6 px-5 pb-8 pt-6"
    >
      <Card variant="soft">
        <View className="items-center gap-2">
          <View className="h-16 w-16 items-center justify-center rounded-2xl bg-orange-100">
            <Text variant="title" tint="muted">
              {avatarLetter}
            </Text>
          </View>
          <Text variant="subheading" tint="default">
            {fullName}
          </Text>
        </View>
      </Card>

      <View className="flex-row gap-2">
        <Card variant="outline" className="flex-1 items-center justify-center gap-1 py-3">
          <Text variant="heading" tint="primary">
            {favorites.length}
          </Text>
          <Text variant="caption" tint="muted" numberOfLines={1}>
            Favoritos
          </Text>
        </Card>
        <Card variant="outline" className="flex-1 items-center justify-center gap-1 py-3">
          <Text variant="heading" tint="primary">
            0
          </Text>
          <Text
            variant="caption"
            tint="muted"
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.85}
          >
            Eventos vistos
          </Text>
        </Card>
        <Card variant="outline" className="flex-1 items-center justify-center gap-1 py-3">
          <Text variant="heading" tint="primary">
            {routesCount}
          </Text>
          <Text variant="caption" tint="muted" numberOfLines={1}>
            Rotas criadas
          </Text>
        </Card>
      </View>

      <View className="gap-2">
        <ListRow
          icon={<Icon name="cog-outline" size={24} color={colors.primary} />}
          title="Configurações"
          description="Notificações e privacidade"
          trailing={<Icon name="chevron-right" size={24} color={colors.gray300} />}
        />
        <ListRow
          icon={<Icon name="help-circle-outline" size={24} color={colors.primary} />}
          title="Ajuda e suporte"
          description="Estamos aqui para ajudar"
          trailing={<Icon name="chevron-right" size={24} color={colors.gray300} />}
        />
        <ListRow
          icon={<Icon name="logout" size={24} color={colors.error} />}
          title="Sair da conta"
          onPress={handleLogout}
          trailing={<Icon name="chevron-right" size={24} color={colors.gray300} />}
        />
      </View>
    </Screen>
  );
}
