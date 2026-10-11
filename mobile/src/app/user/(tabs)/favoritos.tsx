import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/screen';
import { Card, Icon, Text } from '@/components/ui';
import type { IconName } from '@/components/ui/icon';
import { repository } from '@/data';
import { useAsyncData } from '@/hooks/useAsyncData';
import { useFavorites } from '@/hooks/useFavorites';
import { useRefreshOnFocus } from '@/hooks/useRefreshOnFocus';
import { colors } from '@/theme/tokens';
import { eventCategoryIcon } from '@/utils/event-categories';
import { formatDateRange, formatIsoDate } from '@/utils/format';

const COLOR_PALETTE = ['#EF927D', '#6E9EE5', '#B4A7D8', '#5DA5E5', '#F27D5B', '#48BB78'];

function getEventColor(index: number) {
  return COLOR_PALETTE[index % COLOR_PALETTE.length];
}

function getEventDisplayDate(startDate: string | null, endDate: string | null): string {
  const range = formatDateRange(startDate, endDate);
  if (range) return range;
  const iso = formatIsoDate(startDate);
  if (iso) return iso;
  return 'Data a definir';
}

export default function FavoritosTab() {
  const { favorites, toggleFavorite } = useFavorites();
  const {
    state: eventsState,
    reload: reloadEvents,
    refreshing,
  } = useAsyncData(() => repository.listEvents());

  useRefreshOnFocus(reloadEvents);

  const favoritedEvents = useMemo(() => {
    if (eventsState.status !== 'success') return [];
    return eventsState.data.filter((ev) => favorites.includes(ev.id));
  }, [eventsState, favorites]);

  return (
    <Screen
      scrollable
      onRefresh={reloadEvents}
      refreshing={refreshing}
      contentClassName="gap-4 px-5 pb-8 pt-6"
    >
      <Text variant="heading">Favoritos</Text>

      {favoritedEvents.length === 0 ? (
        <Card variant="soft" className="items-center justify-center py-12">
          <Icon name="heart-outline" size={32} color={colors.primary} />
          <Text variant="label" className="mt-2">
            Nenhum favorito ainda
          </Text>
          <Text variant="caption" tint="muted" centered className="mt-1 max-w-xs">
            Explore eventos e toque no coração para salvar seus próximos rolês.
          </Text>
        </Card>
      ) : (
        <View style={styles.eventList}>
          {favoritedEvents.map((item, index) => {
            const iconName = (eventCategoryIcon(item.category) ||
              'calendar-blank-outline') as IconName;
            const cardColor = getEventColor(index);
            const displayDate = getEventDisplayDate(item.startDate, item.endDate);

            return (
              <Pressable
                key={item.id}
                onPress={() => router.push(`/user/event/${item.id}`)}
                style={styles.eventCard}
                accessibilityRole="button"
                accessibilityLabel={`Abrir evento ${item.name}`}
              >
                {/* Visual / Thumbnail */}
                <View style={[styles.eventVisual, { backgroundColor: cardColor }]}>
                  <Icon name={iconName} size={32} color="#FFFFFF" />
                  <View style={styles.visualPill}>
                    <Text style={styles.visualPillText}>ACESSÍVEL</Text>
                  </View>
                </View>

                {/* Detalhes */}
                <View style={styles.eventDetails}>
                  <View style={styles.eventDate}>
                    <Icon name="calendar-month-outline" size={16} color="#2F6FED" />
                    <Text style={styles.eventDateText}>{displayDate}</Text>
                  </View>
                  <Text style={styles.eventTitle} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <View style={styles.eventPlace}>
                    <Icon name="map-marker-outline" size={16} color="#71808F" />
                    <Text style={styles.eventPlaceText} numberOfLines={1}>
                      {item.address || 'Local a definir'}
                    </Text>
                  </View>
                </View>

                {/* Coração / Favorito */}
                <Pressable
                  style={styles.heartBtn}
                  onPress={(e) => {
                    e.stopPropagation();
                    toggleFavorite(item.id);
                  }}
                  accessibilityLabel={`Remover ${item.name} dos favoritos`}
                  accessibilityRole="button"
                >
                  <Icon name="heart-outline" size={20} color="#EF4444" />
                </Pressable>
              </Pressable>
            );
          })}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  eventList: {
    gap: 12,
  },
  eventCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#EFF2F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    position: 'relative',
  },
  eventVisual: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  visualPill: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  visualPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#2F6FED',
    letterSpacing: 0.5,
  },
  eventDetails: {
    padding: 14,
    gap: 6,
  },
  eventDate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  eventDateText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2F6FED',
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1C2733',
  },
  eventPlace: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  eventPlaceText: {
    fontSize: 13,
    color: '#71808F',
    flex: 1,
  },
  heartBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
});
