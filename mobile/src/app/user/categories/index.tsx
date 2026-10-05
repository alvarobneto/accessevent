import { router } from 'expo-router';
import { View } from 'react-native';

import { AsyncContent } from '@/components/async-content';
import { Screen } from '@/components/screen';
import { Card, EmptyState, Icon, ListRow, Text } from '@/components/ui';
import { repository } from '@/data';
import { useAsyncData } from '@/hooks/useAsyncData';
import { useRefreshOnFocus } from '@/hooks/useRefreshOnFocus';
import { colors } from '@/theme/tokens';
import { eventCategoryIcon, eventCategoryLabel } from '@/utils/event-categories';

/**
 * Categorias do "descubra por categoria": só aparecem as que têm ao menos um
 * evento cadastrado, cada uma com a contagem. A lista recarrega quando a tela
 * volta ao foco, porque um evento novo criado pelo organizador muda a contagem.
 */
export default function CategoriesScreen() {
  const { state, reload } = useAsyncData(() => repository.listEventCategories());

  useRefreshOnFocus(reload);

  return (
    <Screen scrollable testID="categories-screen">
      <AsyncContent
        state={state}
        onRetry={reload}
        loadingLabel="Carregando categorias…"
        isEmpty={(categories) => categories.length === 0}
        empty={
          <Card variant="highlight">
            <EmptyState
              icon="tag-outline"
              title="Nenhuma categoria no momento"
              description="As categorias aparecem aqui quando um evento é cadastrado com uma delas."
            />
          </Card>
        }
      >
        {(categories) => (
          <View className="gap-6">
            <Text variant="caption">
              {categories.length === 1
                ? '1 categoria com eventos cadastrados'
                : `${categories.length} categorias com eventos cadastrados`}
            </Text>

            <View className="gap-4">
              {categories.map((item) => {
                const label = eventCategoryLabel(item.category);
                const count = item.eventsCount === 1 ? '1 evento' : `${item.eventsCount} eventos`;

                return (
                  <ListRow
                    key={item.category}
                    icon={
                      <Icon
                        name={eventCategoryIcon(item.category) as never}
                        size={24}
                        color={colors.primary}
                      />
                    }
                    title={label}
                    meta={count}
                    trailing={<Icon name="chevron-right" size={24} color={colors.gray300} />}
                    onPress={() => router.push(`/user/categories/${item.category}`)}
                    accessibilityLabel={`Ver os eventos de ${label}`}
                  />
                );
              })}
            </View>
          </View>
        )}
      </AsyncContent>
    </Screen>
  );
}
