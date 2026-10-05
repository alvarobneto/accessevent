import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Animated,
  DimensionValue,
  Easing,
  StyleSheet,
  Text as RNText,
  TouchableOpacity,
  View,
} from 'react-native';

import { Screen } from '@/components/screen';
import { Icon, Text } from '@/components/ui';
import { colors } from '@/theme/tokens';

// ─── Constantes visuais ──────────────────────────────────────────────────────
const NAV_DARK = '#0f1e35'; // fundo principal
const GLOW_BLUE = '#2563eb'; // azul da marca (mesmo do tokens.primary)
const GLOW_TEAL = '#0d9488'; // teal acessível
const GLOW_ORANGE = '#f97316'; // pino de destino
const GRID_COLOR = 'rgba(255,255,255,0.04)'; // linhas de planta baixa
const DOT_COLOR = 'rgba(59,130,246,0.85)'; // pontos da rota

// ─── Grid de planta baixa ─────────────────────────────────────────────────────
/** Linhas horizontais e verticais que simulam uma grade de mapa de evento. */
function MapGrid() {
  const COLS = 7;
  const ROWS = 10;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Colunas */}
      {Array.from({ length: COLS }).map((_, i) => (
        <View
          key={`col-${i}`}
          style={[styles.gridLine, styles.gridVertical, { left: `${(i / (COLS - 1)) * 100}%` }]}
        />
      ))}
      {/* Linhas */}
      {Array.from({ length: ROWS }).map((_, i) => (
        <View
          key={`row-${i}`}
          style={[styles.gridLine, styles.gridHorizontal, { top: `${(i / (ROWS - 1)) * 100}%` }]}
        />
      ))}
    </View>
  );
}

// ─── Rota pontilhada ──────────────────────────────────────────────────────────
/**
 * Simula um caminho acessível com nós circulares e segmentos entre eles.
 * A rota desce em L (entrada → corredor → destino) como num mapa de evento.
 */
function AccessRoute({ pulse }: { pulse: Animated.Value }) {
  // Pontos da rota: [left%, top%] relativos ao container da arte
  const nodes: [DimensionValue, DimensionValue][] = [
    ['18%', '18%'], // origem (entrada)
    ['18%', '48%'], // cotovelo
    ['62%', '48%'], // corredor horizontal
    ['62%', '72%'], // destino
  ];

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Segmentos entre os nós */}
      {/* Vertical: nó 0 → nó 1 */}
      <View
        style={[
          styles.routeSegment,
          {
            left: '18%',
            top: '18%',
            width: 2,
            height: '30%',
          },
        ]}
      />
      {/* Horizontal: nó 1 → nó 2 */}
      <View
        style={[
          styles.routeSegment,
          {
            left: '18%',
            top: '48%',
            width: '44%',
            height: 2,
          },
        ]}
      />
      {/* Vertical: nó 2 → nó 3 */}
      <View
        style={[
          styles.routeSegment,
          {
            left: '62%',
            top: '48%',
            width: 2,
            height: '24%',
          },
        ]}
      />

      {/* Nós intermediários */}
      {nodes.slice(0, 3).map(([left, top], i) => (
        <View key={i} style={[styles.routeNode, { left, top }]} />
      ))}

      {/* Ícone de pessoa em cadeira de rodas — na curva do corredor */}
      <View style={[styles.personContainer, { left: '28%', top: '43%' }]}>
        <Icon name="wheelchair-accessibility" size={20} color="#fff" />
      </View>

      {/* Nó de destino: pino laranja com pulso */}
      <Animated.View
        style={[
          styles.destinationPulse,
          {
            left: '57%',
            top: '67%',
            opacity: pulse.interpolate({
              inputRange: [0, 1],
              outputRange: [0.3, 0.7],
            }),
            transform: [
              {
                scale: pulse.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 2.2],
                }),
              },
            ],
          },
        ]}
      />
      <View style={[styles.destinationPin, { left: '57%', top: '67%' }]}>
        <Icon name="map-marker" size={24} color={GLOW_ORANGE} />
      </View>

      {/* Checkpoints acessíveis ao longo da rota */}
      <View style={[styles.checkpoint, { left: '14%', top: '30%' }]}>
        <Icon name="elevator" size={20} color={GLOW_TEAL} />
      </View>
      <View style={[styles.checkpoint, { left: '36%', top: '44%' }]}>
        <Icon name="human-handsup" size={20} color={GLOW_TEAL} />
      </View>
    </View>
  );
}

// ─── Glow radial ──────────────────────────────────────────────────────────────
/** Círculos concêntricos em degradê que simulam o glow radial azul/teal. */
function RadialGlow({ breathe }: { breathe: Animated.Value }) {
  return (
    <View style={styles.glowContainer} pointerEvents="none">
      {/* Camada externa — teal, bem suave */}
      <Animated.View
        style={[
          styles.glowRing,
          styles.glowOuter,
          {
            opacity: breathe.interpolate({
              inputRange: [0, 1],
              outputRange: [0.12, 0.22],
            }),
          },
        ]}
      />
      {/* Camada média — azul */}
      <Animated.View
        style={[
          styles.glowRing,
          styles.glowMid,
          {
            opacity: breathe.interpolate({
              inputRange: [0, 1],
              outputRange: [0.18, 0.3],
            }),
          },
        ]}
      />
      {/* Núcleo — azul brilhante */}
      <Animated.View
        style={[
          styles.glowRing,
          styles.glowCore,
          {
            opacity: breathe.interpolate({
              inputRange: [0, 1],
              outputRange: [0.25, 0.45],
            }),
          },
        ]}
      />
    </View>
  );
}

// ─── Tela principal ───────────────────────────────────────────────────────────
export default function SplashScreen() {
  // Animated.Values criados uma única vez via useState (evita useRef.current no render)
  const [breathe] = useState(() => new Animated.Value(0));
  const [pulse] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, {
          toValue: 1,
          duration: 2800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(breathe, {
          toValue: 0,
          duration: 2800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1200,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 600,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ).start();
    // breathe e pulse são valores estáveis (criados com useState uma vez)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Screen scrollable={false} contentClassName="flex-1">
      {/* ── Fundo escuro tela toda ── */}
      <View style={[StyleSheet.absoluteFill, styles.background]} />

      {/* ── Grid de mapa sutil ── */}
      <MapGrid />

      {/* ── Glow radial animado — ocupa a metade superior ── */}
      <RadialGlow breathe={breathe} />

      {/* ── Rota acessível animada ── */}
      <View style={styles.artArea}>
        <AccessRoute pulse={pulse} />
      </View>

      {/* ── Logo no topo ── */}
      <View style={styles.logoRow}>
        <View style={styles.logoBox}>
          <Icon name="wheelchair-accessibility" size={24} color={colors.white} />
        </View>
      </View>

      {/* ── Conteúdo textual — sobreposição na parte inferior ── */}
      <View style={styles.contentPanel}>
        {/* Separador sutil */}
        <View style={styles.divider} />

        {/* Overline: variant caption = 14px mínimo exigido pelo design.md */}
        <Text
          variant="caption"
          className="mb-2 font-bold tracking-widest"
          style={styles.overlineTint}
        >
          ACCESSEVENT
        </Text>

        {/* Headline: usa RNText pois o tamanho (36px) está fora da escala de variantes */}
        <RNText style={styles.headline}>
          Caminhos que{'\n'}
          <RNText style={[styles.headline, styles.headlineAccent]}>incluem.</RNText>
        </RNText>

        {/* Subtítulo: variant caption tint muted */}
        <Text variant="caption" tint="muted" className="mb-6 mt-2" style={styles.subtitleWidth}>
          Descubra lugares e eventos acessíveis perto de você.
        </Text>

        <TouchableOpacity
          style={styles.ctaButton}
          onPress={() => router.push('/login')}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Começar"
        >
          {/* RNText puro para não conflitar com variants do sistema */}
          <RNText style={styles.ctaLabel}>Começar</RNText>
          <Icon name="arrow-right" size={20} color={colors.white} />
        </TouchableOpacity>

        {/* Footnote: variant caption tint muted centrado */}
        <Text variant="caption" tint="muted" centered>
          Acessibilidade para viver mais.
        </Text>
      </View>
    </Screen>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  background: {
    backgroundColor: NAV_DARK,
  },

  // Grid de mapa
  gridLine: {
    position: 'absolute',
    backgroundColor: GRID_COLOR,
  },
  gridVertical: {
    width: 1,
    top: 0,
    bottom: 0,
  },
  gridHorizontal: {
    height: 1,
    left: 0,
    right: 0,
  },

  // Glow radial
  glowContainer: {
    position: 'absolute',
    top: '10%',
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '50%',
  },
  glowRing: {
    position: 'absolute',
    borderRadius: 9999,
  },
  glowOuter: {
    width: 420,
    height: 420,
    backgroundColor: GLOW_TEAL,
  },
  glowMid: {
    width: 300,
    height: 300,
    backgroundColor: GLOW_BLUE,
  },
  glowCore: {
    width: 180,
    height: 180,
    backgroundColor: GLOW_BLUE,
  },

  // Área da arte (ocupa metade superior da tela)
  artArea: {
    position: 'absolute',
    top: '8%',
    left: 0,
    right: 0,
    height: '50%',
  },

  // Rota
  routeSegment: {
    position: 'absolute',
    backgroundColor: DOT_COLOR,
    borderRadius: 2,
  },
  routeNode: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: GLOW_BLUE,
    borderWidth: 2,
    borderColor: '#fff',
    marginLeft: -5,
    marginTop: -5,
    shadowColor: GLOW_BLUE,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 4,
  },
  personContainer: {
    position: 'absolute',
    marginLeft: -12,
    marginTop: -12,
    backgroundColor: 'rgba(37,99,235,0.55)',
    borderRadius: 20,
    padding: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  destinationPin: {
    position: 'absolute',
    marginLeft: -11,
    marginTop: -22,
    zIndex: 2,
  },
  destinationPulse: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: GLOW_ORANGE,
    marginLeft: -3,
    marginTop: -3,
  },
  checkpoint: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(13,148,136,0.2)',
    borderWidth: 1,
    borderColor: GLOW_TEAL,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -10,
    marginTop: -10,
  },

  // Logo
  logoRow: {
    position: 'absolute',
    top: 52,
    left: 24,
  },
  logoBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: GLOW_BLUE,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: GLOW_BLUE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 6,
  },

  // Painel de conteúdo textual (parte inferior)
  contentPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 28,
    paddingBottom: 40,
    paddingTop: 28,
    backgroundColor: 'rgba(15,30,53,0.92)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  divider: {
    width: 36,
    height: 3,
    borderRadius: 2,
    backgroundColor: GLOW_BLUE,
    marginBottom: 20,
    opacity: 0.7,
  },
  // Tint do overline (só a cor — tamanho e peso via className/variant)
  overlineTint: {
    color: GLOW_TEAL,
  },
  // Headline: 36px está fora da escala do sistema, usamos RNText
  headline: {
    color: '#ffffff',
    fontSize: 36,
    fontWeight: '700',
    lineHeight: 42,
    letterSpacing: -0.5,
  },
  headlineAccent: {
    color: GLOW_BLUE,
  },
  // Largura máxima do subtítulo (só layout, cor vem do tint="muted")
  subtitleWidth: {
    maxWidth: 260,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: GLOW_BLUE,
    borderRadius: 14,
    height: 52,
    marginBottom: 16,
    shadowColor: GLOW_BLUE,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 6,
  },
  ctaLabel: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
