import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Screen } from '@/components/screen';
import { Icon, Text } from '@/components/ui';
import type { IconName } from '@/components/ui/icon';
import { repository } from '@/data';
import type { Event } from '@/data/types';
import { useAsyncData } from '@/hooks/useAsyncData';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useFavorites } from '@/hooks/useFavorites';
import { useRefreshOnFocus } from '@/hooks/useRefreshOnFocus';
import { EVENT_CATEGORY_OPTIONS, eventCategoryIcon } from '@/utils/event-categories';
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

// Categorias da seção "Descubra por categoria": primeiras 4 da lista oficial
const categories = EVENT_CATEGORY_OPTIONS.slice(0, 4);

// ─── Segmented Control ────────────────────────────────────────────────────────
type Tab = 'explorar' | 'organizar';

function SegmentedControl({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  return (
    <View style={styles.segmentWrapper}>
      {(['explorar', 'organizar'] as Tab[]).map((tab) => {
        const isActive = active === tab;
        return (
          <Pressable
            key={tab}
            onPress={() => onChange(tab)}
            style={[styles.segmentBtn, isActive && styles.segmentBtnActive]}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
          >
            <Text
              style={[
                styles.segmentLabel,
                isActive ? styles.segmentLabelActive : styles.segmentLabelInactive,
              ]}
            >
              {tab === 'explorar' ? 'Explorar' : 'Organizar'}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ─── Ilustração Exata do Mockup ───────────────────────────────────────────────
function HeroArt() {
  return (
    <View style={artStyles.heroArt} pointerEvents="none">
      {/* Sol / Círculo superior */}
      <View style={artStyles.sun} />

      {/* Arco secundário azul claro */}
      <View style={artStyles.archTwo} />

      {/* Arco primário creme */}
      <View style={artStyles.archOne} />

      {/* Figura humana em cadeira de rodas */}
      <View style={artStyles.person}>
        <View style={artStyles.head} />
        <View style={artStyles.body} />
        <View style={artStyles.wheelOne} />
        <View style={artStyles.wheelTwo} />
      </View>

      {/* Linha da rota / rampa azul */}
      <View style={artStyles.pathLine} />
    </View>
  );
}

const artStyles = StyleSheet.create({
  heroArt: {
    position: 'absolute',
    width: 180,
    height: 210,
    right: -5,
    bottom: 0,
    overflow: 'hidden',
  },
  sun: {
    position: 'absolute',
    width: 105,
    height: 105,
    borderRadius: 53,
    backgroundColor: '#F7B594',
    top: 12,
    right: 20,
  },
  archOne: {
    position: 'absolute',
    width: 78,
    height: 138,
    borderTopLeftRadius: 80,
    borderTopRightRadius: 80,
    backgroundColor: '#FFF4E9',
    right: 18,
    top: 67,
    opacity: 0.8,
  },
  archTwo: {
    position: 'absolute',
    width: 58,
    height: 112,
    borderTopLeftRadius: 80,
    borderTopRightRadius: 80,
    backgroundColor: '#BFD2ED',
    right: 77,
    top: 91,
  },
  person: {
    position: 'absolute',
    right: 50,
    bottom: 20,
    width: 64,
    height: 102,
    zIndex: 2,
  },
  head: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#313D4D',
    left: 26,
    top: 0,
  },
  body: {
    position: 'absolute',
    width: 30,
    height: 47,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    backgroundColor: '#F27D5B',
    left: 23,
    top: 20,
    transform: [{ rotate: '-12deg' }],
  },
  wheelOne: {
    position: 'absolute',
    borderWidth: 4,
    borderColor: '#26384D',
    borderRadius: 15,
    width: 30,
    height: 30,
    top: 60,
    left: 7,
    backgroundColor: 'transparent',
  },
  wheelTwo: {
    position: 'absolute',
    borderWidth: 4,
    borderColor: '#26384D',
    borderRadius: 15,
    width: 30,
    height: 30,
    top: 60,
    right: 0,
    backgroundColor: 'transparent',
  },
  pathLine: {
    position: 'absolute',
    backgroundColor: '#5DA5E5',
    width: 100,
    height: 10,
    bottom: 13,
    right: 13,
    transform: [{ rotate: '-10deg' }],
    borderRadius: 10,
    zIndex: 3,
  },
});

const EMPTY_EVENTS: Event[] = [];

// ─── Tela Principal ───────────────────────────────────────────────────────────
export default function ExplorarTab() {
  const [tab, setTab] = useState<Tab>('explorar');
  const [showAllEvents, setShowAllEvents] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { favorites, toggleFavorite } = useFavorites();
  const insets = useSafeAreaInsets();
  const { user } = useCurrentUser();

  // Dados reais dos eventos cadastrados no backend / repositório
  const { state: eventsState, reload: reloadEvents } = useAsyncData(() => repository.listEvents());

  const { state: mapsData, reload: reloadMaps } = useAsyncData(async () => {
    const events = await repository.listEvents();
    const mapLists = await Promise.all(
      events.map((e) => repository.listNavigationMaps(e.id).catch(() => [])),
    );
    return mapLists.reduce((total, maps) => total + maps.length, 0);
  });

  useRefreshOnFocus(() => {
    reloadEvents();
    reloadMaps();
  });

  const userName = user?.firstName || 'Visitante';
  const avatarLetter = (user?.firstName?.[0] || user?.email?.[0] || 'V').toUpperCase();
  const todayFormatted = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
    .format(new Date())
    .toUpperCase();

  const realEvents: Event[] = useMemo(
    () => (eventsState.status === 'success' ? eventsState.data : EMPTY_EVENTS),
    [eventsState],
  );

  // Filtro de busca em tempo real
  const filteredEvents = useMemo(() => {
    if (!searchQuery.trim()) return realEvents;
    const q = searchQuery.toLowerCase().trim();
    return realEvents.filter(
      (ev) =>
        ev.name.toLowerCase().includes(q) ||
        (ev.address && ev.address.toLowerCase().includes(q)) ||
        (ev.description && ev.description.toLowerCase().includes(q)) ||
        (ev.category && ev.category.toLowerCase().includes(q)),
    );
  }, [realEvents, searchQuery]);

  // Contadores para o modo organizador
  const activeEventsCount =
    realEvents.length < 10 ? `0${realEvents.length}` : `${realEvents.length}`;
  const totalMaps = mapsData.status === 'success' ? mapsData.data : 0;
  const mapsCount = totalMaps < 10 ? `0${totalMaps}` : `${totalMaps}`;

  return (
    <Screen scrollable={false} contentClassName="flex-1">
      {/* ── Topbar com Safe Area ── */}
      <View style={[styles.topbar, { paddingTop: Math.max(insets.top, 16) + 6 }]}>
        {/* Marca Acesso */}
        <View style={styles.brandMark}>
          <Icon name="wheelchair-accessibility" size={20} color="#FFFFFF" />
        </View>

        {/* Alternador de Modo */}
        <SegmentedControl active={tab} onChange={setTab} />

        {/* Botão Notificações */}
        <Pressable
          style={styles.iconButton}
          accessibilityLabel="Notificações"
          accessibilityRole="button"
        >
          <Icon name="bell-outline" size={20} color="#17212B" />
        </Pressable>
      </View>

      {/* ── Conteúdo Rolável ── */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {tab === 'explorar' ? (
          <>
            {/* Saudação */}
            <View style={styles.greetingRow}>
              <View>
                <Text style={styles.eyebrow}>{todayFormatted}</Text>
                <View style={styles.greetingTitleRow}>
                  <Text variant="heading" style={styles.greetingTitle}>
                    Olá, {userName}
                  </Text>
                  <Icon name="star-four-points" size={20} color="#2F6FED" />
                </View>
              </View>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{avatarLetter}</Text>
              </View>
            </View>

            {/* Hero Card "Seu Próximo Rolê" */}
            <View style={styles.heroCard}>
              <View style={styles.heroCopy}>
                <View style={styles.heroKicker}>
                  <Icon name="star-four-points" size={20} color="#2F6FED" />
                  <Text style={styles.heroKickerText}>SEU PRÓXIMO ROLÊ</Text>
                </View>
                <Text style={styles.heroHeading}>
                  Encontre seu caminho{'\n'}com mais liberdade.
                </Text>
                <Text style={styles.heroCopyText}>
                  Mapas acessíveis para você aproveitar cada momento.
                </Text>
                <TouchableOpacity
                  style={styles.heroButton}
                  accessibilityRole="button"
                  accessibilityLabel="Explorar eventos"
                  activeOpacity={0.85}
                  onPress={() => {
                    if (realEvents.length > 0) {
                      router.push(`/user/event/${realEvents[0].id}`);
                    } else {
                      router.push('/user/map/exemplo');
                    }
                  }}
                >
                  <Text style={styles.heroButtonText}>Explorar eventos</Text>
                  <Icon name="arrow-right" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              {/* Arte gráfica integrada */}
              <HeroArt />
            </View>

            {/* Barra de Busca */}
            <View style={styles.searchBox}>
              <Icon name="magnify" size={20} color="#9AA6B3" />
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar eventos, locais..."
                placeholderTextColor="#9AA6B3"
                value={searchQuery}
                onChangeText={setSearchQuery}
                returnKeyType="search"
              />
              {searchQuery.length > 0 ? (
                <Pressable
                  onPress={() => setSearchQuery('')}
                  hitSlop={8}
                  accessibilityLabel="Limpar busca"
                >
                  <Icon name="close" size={18} color="#7B8998" />
                </Pressable>
              ) : (
                <Pressable style={styles.searchFilterBtn} accessibilityLabel="Abrir filtros">
                  <Icon name="menu" size={20} color="#7B8998" />
                </Pressable>
              )}
            </View>

            {/* Seção: Para você */}
            <View style={styles.sectionBlock}>
              <View style={styles.sectionHeading}>
                <Text style={styles.sectionHeadingTitle}>Para você</Text>
                {filteredEvents.length > 2 && (
                  <Pressable
                    onPress={() => setShowAllEvents((prev) => !prev)}
                    style={styles.seeAllBtn}
                  >
                    <Text style={styles.seeAllText}>
                      {showAllEvents ? 'Ver menos' : 'Ver todos'}
                    </Text>
                    <Icon name="chevron-right" size={20} color="#2F6FED" />
                  </Pressable>
                )}
              </View>

              {eventsState.status === 'loading' ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#2F6FED" />
                  <Text style={styles.loadingText}>Carregando eventos...</Text>
                </View>
              ) : filteredEvents.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Icon name="calendar-blank-outline" size={32} color="#9AA6B3" />
                  <Text style={styles.emptyTitle}>
                    {searchQuery.trim() ? 'Nenhum evento encontrado' : 'Nenhum evento cadastrado'}
                  </Text>
                  <Text style={styles.emptyDescription}>
                    {searchQuery.trim()
                      ? 'Tente buscar com outro termo.'
                      : 'Crie seu primeiro evento no modo Organizar.'}
                  </Text>
                  {!searchQuery.trim() && (
                    <TouchableOpacity
                      style={styles.emptyActionBtn}
                      onPress={() => setTab('organizar')}
                    >
                      <Text style={styles.emptyActionText}>Ir para Organizar</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                <View style={styles.eventList}>
                  {(showAllEvents ? filteredEvents : filteredEvents.slice(0, 3)).map(
                    (item, index) => {
                      const iconName = (eventCategoryIcon(item.category) ||
                        'calendar-blank-outline') as IconName;
                      const cardColor = getEventColor(index);
                      const isFavorited = favorites.includes(item.id);
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
                            accessibilityLabel={`Favoritar ${item.name}`}
                            accessibilityRole="button"
                          >
                            <Icon
                              name="heart-outline"
                              size={20}
                              color={isFavorited ? '#EF4444' : '#A5B0BD'}
                            />
                          </Pressable>
                        </Pressable>
                      );
                    },
                  )}
                </View>
              )}
            </View>

            {/* Seção: Descubra por categoria */}
            <View style={styles.sectionBlock}>
              <View style={styles.sectionHeading}>
                <Text style={styles.sectionHeadingTitle}>Descubra por categoria</Text>
                <Icon name="help-circle-outline" size={20} color="#71808F" />
              </View>

              <View style={styles.categoryRow}>
                {categories.map((category) => (
                  <Pressable
                    key={category.key}
                    style={styles.category}
                    accessibilityRole="button"
                    accessibilityLabel={`Ver eventos de ${category.label}`}
                    onPress={() => router.push(`/user/categories/${category.key}`)}
                  >
                    <Icon name={category.icon as IconName} size={20} color="#2F6FED" />
                    <Text style={styles.categoryLabel}>{category.label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </>
        ) : (
          /* ── Modo Organizador ── */
          <>
            {/* Saudação Organizador */}
            <View style={styles.greetingRow}>
              <View>
                <Text style={styles.eyebrow}>MODO ORGANIZADOR</Text>
                <View style={styles.greetingTitleRow}>
                  <Text variant="heading" style={styles.greetingTitle}>
                    Seu espaço,{' '}
                    <Text
                      variant="heading"
                      style={[styles.greetingTitle, styles.greetingHighlight]}
                    >
                      mais acessível.
                    </Text>
                  </Text>
                </View>
              </View>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{avatarLetter}</Text>
              </View>
            </View>

            {/* Banner Painel Geral */}
            <View style={styles.organizerBanner}>
              <View style={styles.organizerBannerCopy}>
                <View style={styles.organizerKicker}>
                  <Icon name="map-outline" size={14} color="#A8CAFA" />
                  <Text style={styles.organizerKickerText}>PAINEL GERAL</Text>
                </View>
                <Text style={styles.organizerBannerHeading}>
                  Vamos criar caminhos{'\n'}que incluem todos.
                </Text>
              </View>
              <Icon name="wheelchair-accessibility" size={56} color="#A8CAFA" />
            </View>

            {/* Grade de Estatísticas */}
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{activeEventsCount}</Text>
                <Text style={styles.statLabel}>Eventos ativos</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{mapsCount}</Text>
                <Text style={styles.statLabel}>Mapas criados</Text>
              </View>
            </View>

            {/* Botão de Ação Primária: Criar Evento */}
            <TouchableOpacity
              style={styles.primaryActionButton}
              activeOpacity={0.85}
              onPress={() => router.push('/organizer/event/new')}
              accessibilityRole="button"
              accessibilityLabel="Criar novo evento"
            >
              <Icon name="plus" size={20} color="#FFFFFF" />
              <Text style={styles.primaryActionText}>Criar novo evento</Text>
            </TouchableOpacity>

            {/* Seção: Seus eventos */}
            <View style={styles.sectionBlock}>
              <View style={styles.sectionHeading}>
                <Text style={styles.sectionHeadingTitle}>Seus eventos</Text>
                <Pressable onPress={() => router.push('/organizer')} style={styles.seeAllBtn}>
                  <Text style={styles.seeAllText}>Ver todos</Text>
                  <Icon name="chevron-right" size={20} color="#2F6FED" />
                </Pressable>
              </View>

              <View style={styles.organizerEventList}>
                {eventsState.status === 'loading' ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color="#2F6FED" />
                    <Text style={styles.loadingText}>Carregando eventos...</Text>
                  </View>
                ) : realEvents.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Icon name="calendar-blank-outline" size={32} color="#9AA6B3" />
                    <Text style={styles.emptyTitle}>Nenhum evento criado</Text>
                    <Text style={styles.emptyDescription}>
                      Toque no botão acima para cadastrar seu primeiro evento.
                    </Text>
                  </View>
                ) : (
                  realEvents.slice(0, 3).map((item, index) => {
                    const cardColor = getEventColor(index);
                    const iconName = (eventCategoryIcon(item.category) ||
                      'calendar-month-outline') as IconName;
                    const displayDate = getEventDisplayDate(item.startDate, item.endDate);

                    return (
                      <Pressable
                        key={item.id}
                        onPress={() => router.push(`/organizer/event/${item.id}`)}
                        style={styles.organizerEventCard}
                        accessibilityRole="button"
                        accessibilityLabel={`Gerenciar evento ${item.name}`}
                      >
                        <View style={[styles.miniVisual, { backgroundColor: cardColor }]}>
                          <Icon name={iconName} size={22} color="#FFFFFF" />
                        </View>
                        <View style={styles.organizerEventDetails}>
                          <Text style={styles.organizerEventTitle} numberOfLines={1}>
                            {item.name}
                          </Text>
                          <Text style={styles.organizerEventSub} numberOfLines={1}>
                            {displayDate} · {item.address || 'Local a definir'}
                          </Text>
                        </View>
                        <Icon name="chevron-right" size={20} color="#9AA6B2" />
                      </Pressable>
                    );
                  })
                )}
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

// ─── Estilos Baseados no Design System ─────────────────────────────────────────
const FONT_REGULAR = 'Nunito_400Regular';
const FONT_MEDIUM = 'Nunito_500Medium';
const FONT_SEMIBOLD = 'Nunito_600SemiBold';
const FONT_BOLD = 'Nunito_700Bold';

const styles = StyleSheet.create({
  // Topbar
  topbar: {
    paddingHorizontal: 22,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E6EBF1',
  },
  brandMark: {
    backgroundColor: '#2F6FED',
    width: 37,
    height: 37,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButton: {
    backgroundColor: '#F5F7FA',
    width: 37,
    height: 37,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Switch de Modo — pílula compacta
  segmentWrapper: {
    backgroundColor: '#F4F5F7',
    padding: 3,
    borderRadius: 12,
    flexDirection: 'row',
    marginHorizontal: 10,
  },
  segmentBtn: {
    borderRadius: 9,
    paddingVertical: 6,
    paddingHorizontal: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#20344C',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 1,
  },
  segmentLabel: {
    fontSize: 12,
    fontFamily: FONT_MEDIUM,
  },
  segmentLabelActive: {
    color: '#17212B',
  },
  segmentLabelInactive: {
    color: '#7A8795',
  },

  // Scroll
  scrollContent: {
    paddingHorizontal: 22,
    paddingTop: 14,
    paddingBottom: 36,
    backgroundColor: '#FFFFFF',
  },

  // Greeting
  greetingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 20,
    paddingTop: 4,
  },
  eyebrow: {
    color: '#71808F',
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 0.6,
    fontFamily: FONT_BOLD,
    marginBottom: 5,
  },
  greetingTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 2,
  },
  greetingTitle: {
    fontSize: 24,
    lineHeight: 32,
    fontFamily: FONT_BOLD,
    letterSpacing: -0.4,
    color: '#17212B',
  },
  greetingHighlight: {
    color: '#2F6FED',
  },
  avatar: {
    width: 41,
    height: 41,
    borderRadius: 15,
    backgroundColor: '#F6C9B7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#743F31',
    fontFamily: FONT_BOLD,
    fontSize: 16,
  },

  // Hero Card (Modo Explorar)
  heroCard: {
    backgroundColor: '#DCEAFE',
    minHeight: 217,
    borderRadius: 25,
    overflow: 'hidden',
    position: 'relative',
    padding: 22,
    marginBottom: 17,
  },
  heroCopy: {
    width: '63%',
    zIndex: 2,
  },
  heroKicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 8,
  },
  heroKickerText: {
    color: '#2F6FED',
    fontSize: 10,
    fontFamily: FONT_BOLD,
    letterSpacing: 0.6,
  },
  heroHeading: {
    fontSize: 21,
    lineHeight: 24,
    color: '#17212B',
    fontFamily: FONT_BOLD,
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  heroCopyText: {
    color: '#59718D',
    fontSize: 11,
    lineHeight: 16,
    maxWidth: 170,
    fontFamily: FONT_REGULAR,
  },
  heroButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    alignSelf: 'flex-start',
    backgroundColor: '#2F6FED',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 14,
  },
  heroButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontFamily: FONT_BOLD,
  },

  // Search Box
  searchBox: {
    height: 49,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#E6EBF1',
    borderRadius: 14,
    paddingHorizontal: 14,
    marginBottom: 24,
    backgroundColor: '#FFFFFF',
  },
  searchInput: {
    color: '#17212B',
    fontSize: 13,
    fontFamily: FONT_REGULAR,
    flex: 1,
    paddingVertical: 0,
  },
  searchFilterBtn: {
    padding: 4,
  },

  // Seções
  sectionBlock: {
    marginBottom: 24,
  },
  sectionHeading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionHeadingTitle: {
    fontSize: 17,
    fontFamily: FONT_BOLD,
    color: '#17212B',
    letterSpacing: -0.3,
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  seeAllText: {
    color: '#2F6FED',
    fontSize: 11,
    fontFamily: FONT_BOLD,
  },

  // Cards de Evento (Modo Explorar)
  eventList: {
    gap: 12,
  },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#E6EBF1',
    backgroundColor: '#FFFFFF',
    borderRadius: 17,
    padding: 8,
    shadowColor: '#4E647A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 7,
    elevation: 1,
  },
  eventVisual: {
    width: 96,
    height: 88,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  visualPill: {
    position: 'absolute',
    left: 7,
    bottom: 7,
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 3,
  },
  visualPillText: {
    fontSize: 7,
    fontFamily: FONT_BOLD,
    color: '#39617B',
    letterSpacing: 0.6,
  },
  eventDetails: {
    flex: 1,
    gap: 4,
  },
  eventDate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  eventDateText: {
    color: '#2F6FED',
    fontSize: 10,
    fontFamily: FONT_BOLD,
  },
  eventTitle: {
    fontSize: 14,
    fontFamily: FONT_SEMIBOLD,
    color: '#17212B',
    lineHeight: 18,
  },
  eventPlace: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  eventPlaceText: {
    color: '#71808F',
    fontSize: 10,
    lineHeight: 14,
    flex: 1,
    fontFamily: FONT_REGULAR,
  },
  heartBtn: {
    padding: 6,
    marginRight: 4,
  },

  // Categorias
  categoryRow: {
    flexDirection: 'row',
    gap: 9,
    justifyContent: 'space-between',
  },
  category: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E6EBF1',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    height: 71,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  categoryLabel: {
    fontSize: 10,
    fontFamily: FONT_MEDIUM,
    color: '#536273',
  },

  // Loading & Empty States
  loadingContainer: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    fontFamily: FONT_MEDIUM,
    color: '#71808F',
  },
  emptyContainer: {
    paddingVertical: 28,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#D4DCE5',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FAFCFE',
  },
  emptyTitle: {
    fontSize: 14,
    fontFamily: FONT_BOLD,
    color: '#17212B',
    marginTop: 4,
  },
  emptyDescription: {
    fontSize: 11,
    fontFamily: FONT_REGULAR,
    color: '#71808F',
    textAlign: 'center',
    maxWidth: 240,
  },
  emptyActionBtn: {
    marginTop: 10,
    backgroundColor: '#2F6FED',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  emptyActionText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontFamily: FONT_BOLD,
  },

  // ─── Estilos do Modo Organizador ───
  organizerBanner: {
    backgroundColor: '#294F8F',
    minHeight: 140,
    borderRadius: 22,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  organizerBannerCopy: {
    flex: 1,
    paddingRight: 12,
  },
  organizerKicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 6,
  },
  organizerKickerText: {
    color: '#A8CAFA',
    fontSize: 10,
    fontFamily: FONT_BOLD,
    letterSpacing: 0.6,
  },
  organizerBannerHeading: {
    fontSize: 19,
    lineHeight: 24,
    color: '#FFFFFF',
    fontFamily: FONT_BOLD,
    letterSpacing: -0.3,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 18,
  },
  statCard: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#E6EBF1',
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontFamily: FONT_BOLD,
    color: '#2F6FED',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 9,
    fontFamily: FONT_MEDIUM,
    color: '#71808F',
    textAlign: 'center',
  },
  primaryActionButton: {
    backgroundColor: '#2F6FED',
    borderRadius: 13,
    height: 48,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: FONT_BOLD,
  },
  organizerEventList: {
    gap: 10,
  },
  organizerEventCard: {
    borderWidth: 1,
    borderColor: '#E6EBF1',
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  miniVisual: {
    width: 46,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  organizerEventDetails: {
    flex: 1,
    gap: 2,
  },
  organizerEventTitle: {
    fontSize: 14,
    fontFamily: FONT_SEMIBOLD,
    color: '#17212B',
  },
  organizerEventSub: {
    fontSize: 10,
    fontFamily: FONT_REGULAR,
    color: '#71808F',
  },
});
