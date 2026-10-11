import { useCallback, useMemo } from 'react';
import {
  PanResponder,
  Pressable,
  StyleSheet,
  View,
  type GestureResponderEvent,
  type PanResponderGestureState,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { PoiTypeValues, type PoiType } from '@/data/types';
import { tv } from '@/lib/tv';
import { colors } from '@/theme/tokens';
import type { Coordinate } from '@/types/coordinates';
import type { IconName } from '@/types/icon';
import type { ScreenPoint } from '@/utils/dropCoordinate';
import { poiIcon } from '@/utils/poiIcons';

/**
 * Distância, em pixels, a partir da qual o toque no ícone vira arrasto.
 *
 * O `PanResponder` decide no primeiro `move` se o toque é um arrasto, e o padrão
 * disso é 10px — curto o bastante para que rolar a tela puxando o ícone mude a
 * posição do ponto sem querer. A 24px, quem quis rolar a tela passa do ícone sem
 * arrastar nada, e quem quis arrastar percorre o caminho inteiro até o mapa.
 */
const DRAG_THRESHOLD = 24;

/**
 * Duração de entrada e de saída do ícone que segue o dedo.
 *
 * Só a opacidade é animada: a posição segue o dedo direto, e um `withTiming` na
 * posição adicionaria 120ms de atraso entre o dedo e o ícone — que é justamente o
 * atraso que faz o gesto parecer quebrado. A escala também entra com timing, que
 * ali é transição e não atraso.
 */
const GHOST_TIMING = 120;

export type PoiPaletteProps = {
  /** Tipo que está selecionado, e que o mapa mostra como rascunho. */
  selectedType: PoiType;
  /** Escolher o tipo sem arrastar — é a porta do toque e a do leitor de tela. */
  onSelectType: (type: PoiType) => void;
  /**
   * O ícone foi solto sobre o mapa.
   *
   * `coordinate` é `null` quando o dedo soltou fora do retângulo do mapa, ou
   * quando o mapa ainda não tem tamanho suficiente para converter. Quem chama
   * decide se avisa e o que fazer com o tipo — este componente não conhece o
   * `EventMap` e não sabe converter ponto de tela em coordenada.
   *
   * É a paleta que resolve o ponto, e não o item: o `PanResponder` entrega um
   * ponto de tela e a conversão é o que separa "onde o dedo soltou" de "que
   * coordenada é essa". O item não conhece `EventMap` e não deveria.
   *
   * Pode devolver `Promise`: `resolveDrop` é assíncrono porque medir o retângulo do
   * mapa na janela é assíncrono, e quem chama pode querer persistir só depois.
   */
  onDrop: (type: PoiType, coordinate: Coordinate | null) => void | Promise<void>;
  /**
   * Converte o ponto de queda em coordenada, ou `null` enquanto o mapa não está
   * pronto. Ausente quando quem monta a paleta não tem mapa — a paleta usada fora
   * do formulário de ponto não tem onde converter, e fingir que tem seria pior do
   * que a porta do toque continuar funcionando sozinha.
   */
  resolveDrop?: ((point: ScreenPoint) => Coordinate | null | Promise<Coordinate | null>) | null;
};

/**
 * A paleta de pontos de interesse: um ícone por tipo, arrastável para o mapa.
 *
 * **Arraste e toque são a mesma escolha por duas portas.** Arrastar o ícone até o
 * lugar é o caminho mais direto — a pessoa aponta e o ponto nasce onde apontou.
 * Mas arraste não é acessível: leitor de tela não arrasta, e arrasto é o gesto mais
 * difícil de acertar para quem tem tremor ou coordenação motora fina. Então tocar
 * no ícone **seleciona o tipo** e tocar no mapa **coloca o ponto desse tipo**: as
 * duas portas escrevem no mesmo estado e produzem o mesmo ponto. O arraste é o
 * atalho, não o mecanismo único.
 *
 * **Por que `PanResponder` e não `react-native-gesture-handler`.** Este app não
 * tem o gesture-handler como dependência direta — ele aparece só como
 * transitivo do `expo-router` — e o gesto aqui é um arraste de dois eixos, sem
 * pinça, sem múltiplos toques, sem simultaneidade. O `PanResponder` vem no
 * React Native, resolve isso sem pedir um módulo nativo novo, sem
 * `GestureHandlerRootView` na raiz e sem plugin de Babel. A animação do ícone que
 * segue o dedo é do Reanimated, que já é dependência do app pelo NativeWind.
 *
 * **O ícone que segue o dedo não é o item.** O `Pressable` fica onde está, com o
 * `selected` dele, e o que viaja é um desenho à parte, dentro do próprio item e
 * deslocado pelo `dx`/`dy` do gesto. Traduzir o gesto em deslocamento relativo ao
 * item evita converter coordenada de tela para coordenada de conteúdo do
 * `ScrollView` — o `ScrollView` da tela tem deslocamento próprio, e essa conta é a
 * mesma armadilha que a origem do mapa corrige no lado do `EventMap`. A
 * *coordenada* do ponto continua saindo de `pageX`/`pageY`, que são relativos à
 * raiz e portanto compatíveis com o `measureInWindow` do mapa.
 *
 * O `zIndex` alto da paleta existe só para o ícone em trânsito desenhar por cima
 * do mapa. Não atrapalha o resto: paleta e mapa estão empilhados verticalmente e
 * nunca se sobrepõem.
 */
export function PoiPalette({
  selectedType,
  onSelectType,
  onDrop,
  resolveDrop = null,
}: PoiPaletteProps) {
  const canConvert = resolveDrop !== null;

  /**
   * O `PanResponder` do item entrega o ponto de queda e é este `handleDrop` que
   * decide o que acontece com ele.
   *
   * O item conhece o gesto e a paleta conhece a conversão: o item entrega o ponto de
   * tela e este callback entrega a coordenada — ou `null`, quando não deu para
   * converter. É essa divisão que mantém o `PanResponder` longe do `EventMap`.
   *
   * A conversão é assíncrona e o `PanResponder` não espera promessa nenhuma: ele
   * dispara `onPanResponderRelease`, esquece o gesto e devolve o controle. Por isso o
   * trabalho é jogado para fora (`void`) em vez de ser esperado aqui — e é por isso
   * que o `useMemo` do responder pode depender de `onDrop` sem risco: o responder
   * criado no gesto anterior pode chamar a versão antiga do callback, e a versão
   * antiga converte o ponto do mesmo jeito, porque a conversão mora no `EventMap`,
   * não no closure.
   */
  const handleDrop = useCallback(
    (type: PoiType, point: ScreenPoint) => {
      void (async () => {
        await onDrop(type, resolveDrop ? await resolveDrop(point) : null);
      })();
    },
    [onDrop, resolveDrop],
  );

  return (
    <View className="gap-3" style={styles.lifted}>
      <Text variant="subheading">Pontos de interesse</Text>
      <Text variant="caption">
        Arraste um ícone até o lugar no mapa. Ou toque no ícone e depois toque no mapa.
      </Text>

      <View className="flex-row flex-wrap gap-2">
        {PoiTypeValues.map((type) => (
          <PaletteItem
            key={type}
            type={type}
            selected={selectedType === type}
            onPress={() => onSelectType(type)}
            onDrop={handleDrop}
          />
        ))}
      </View>

      <Text variant="caption" tint={canConvert ? 'muted' : 'danger'}>
        {canConvert
          ? 'Solte em cima do mapa para colocar o ponto.'
          : 'O mapa ainda está abrindo. Toque no ícone e depois toque no mapa.'}
      </Text>
    </View>
  );
}

type PaletteItemProps = {
  type: PoiType;
  selected: boolean;
  onPress: () => void;
  /** `void` ou `Promise`: a conversão do ponto de queda é assíncrona. */
  onDrop: (type: PoiType, point: ScreenPoint) => void | Promise<void>;
};

/**
 * Um ícone da paleta: alvo de toque, alvo de arrasto e, enquanto é arrastado, o
 * desenho que segue o dedo.
 *
 * O alvo de toque tem `min-h-11`/`min-w-11`, o piso de 44px do `design.md` para
 * alvo tocável. O `Pressable` e o `PanResponder` convivem sem roubar o gesto:
 * `Pressable` só dispara `onPress` quando o dedo não saiu do item, e o
 * `PanResponder` só assume o toque quando o dedo saiu o bastante. Quem arrasta não
 * dispara o toque; quem toca não arrasta.
 *
 * **Um `PanResponder` por tipo, e não um para a paleta inteira.** Com um único
 * responder, o arrasto começaria no ícone tocado mas o `dx`/`dy` do gesto seria
 * relativo ao canto da paleta, e soltar em cima do mapa acrescentaria essa
 * diferença à posição do ponto — o ponto nasceria deslocado do dedo.
 */
function PaletteItem({ type, selected, onPress, onDrop }: PaletteItemProps) {
  const icon: IconName = poiIcon(type);

  /** Deslocamento do ícone em trânsito, relativo ao item. */
  const offsetX = useSharedValue(0);
  const offsetY = useSharedValue(0);

  /** 1 enquanto o ícone está em trânsito, 0 quando está no lugar. */
  const ghosted = useSharedValue(0);

  /**
   * Os valores do gesto são escritos por `set()` e nunca por `value =`.
   *
   * Reanimated expõe os dois, e o compilador do React não distingue a
   * semântica de um do outro: ele lê `compartilhado.valor = x` como mutação de um
   * objeto que veio de um hook, que é proibida durante o ciclo de render. `set()`
   * é a mesma escrita — `SharedValue.set()` chama exatamente o mesmo
   * `valueSetter` que a atribuição usa — porém é uma chamada de método, e o
   * `PanResponder` só roda fora do render, então não há mutação durante o render
   * para a regra enxergar.
   *
   *
   * E é por isso que `resetOffsets` existe como `useCallback` separado, e não
   * escrito dentro do `useMemo` do `PanResponder`: o responder precisa de
   * identidade estável, e um objeto novo a cada render trocaria o responsável
   * pelo gesto no meio da queda.
   */
  const resetOffsets = useCallback(() => {
    offsetX.set(0);
    offsetY.set(0);
    ghosted.set(0);
  }, [ghosted, offsetX, offsetY]);

  const responder = useMemo(
    () =>
      PanResponder.create({
        // **O toque não é tomado aqui, e isso é o que mantém as duas portas.** Se
        // o item devolvesse `true` já no `start`, ele se tornaria o responsável
        // pelo gesto antes do `Pressable` resolver o toque — e o `onPress` de
        // selecionar o tipo nunca chegaria. Quem toma o gesto é o `move`, e só
        // depois do limiar; abaixo dele, ninguém toma e o toque passa intacto.
        //
        // A consequência é que `onPanResponderRelease` só existe depois de um
        // arrasto de verdade: soltar sem arrastar é um toque, e o toque é do
        // `Pressable`.
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (
          _event: GestureResponderEvent,
          gesture: PanResponderGestureState,
        ) => Math.abs(gesture.dx) > DRAG_THRESHOLD || Math.abs(gesture.dy) > DRAG_THRESHOLD,

        onPanResponderGrant: () => {
          ghosted.set(1);
        },

        onPanResponderMove: (_event: GestureResponderEvent, gesture: PanResponderGestureState) => {
          // O `dx`/`dy` relativo ao toque inicial é o que desloca o ícone em
          // trânsito, e o `pageX`/`pageY` absolutos são o que vira coordenada na
          // hora de soltar.
          offsetX.set(gesture.dx);
          offsetY.set(gesture.dy);
        },

        onPanResponderRelease: (event: GestureResponderEvent) => {
          resetOffsets();
          onDrop(type, {
            x: event.nativeEvent.pageX,
            y: event.nativeEvent.pageY,
          });
        },

        onPanResponderTerminate: resetOffsets,
        // `false`: o `ScrollView` da tela pede o gesto assim que o arrasto vira
        // vertical, e a paleta está dentro dele. Devolver `true` deixaria a rolagem
        // roubar o gesto no meio da queda e o ponto nasceria de um `release` que
        // nunca aconteceu — ou não nasceria, sem nenhum aviso.
        onPanResponderTerminationRequest: () => false,
      }),
    [ghosted, offsetX, offsetY, onDrop, resetOffsets, type],
  );

  // A opacidade vai por timing e não por comparação direta dos offsets porque o
  // item volta a zero no mesmo quadro do `release`: sem a transição, o ícone em
  // trânsito sumiria e o do lugar reapareceria no mesmo quadro, e o corte é
  // visível mesmo com a queda certa.
  const ghostStyle = useAnimatedStyle(() => ({
    opacity: withTiming(ghosted.value, { duration: GHOST_TIMING }),
    transform: [
      { translateX: offsetX.value },
      { translateY: offsetY.value },
      { scale: 1 + 0.15 * ghosted.value },
    ],
  }));

  const restingStyle = useAnimatedStyle(() => ({
    opacity: withTiming(1 - ghosted.value, { duration: GHOST_TIMING }),
  }));

  return (
    <View {...responder.panHandlers} className="relative">
      <Animated.View style={restingStyle}>
        <Pressable
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={type}
          accessibilityHint="Toque para escolher este tipo e depois tocar no mapa. Ou arraste até o mapa."
          accessibilityState={{ selected }}
          testID={`palette-${type}`}
          className={itemVariants({ selected })}
        >
          <Icon name={icon} size={24} color={selected ? colors.white : colors.primary} />
          <Text
            variant="caption"
            tint={selected ? 'inverse' : 'default'}
            className="mt-1 text-center"
          >
            {type}
          </Text>
        </Pressable>
      </Animated.View>

      {/* O ícone em trânsito é só desenho: `pointerEvents="none"` para não roubar
          o toque, que já está sendo tratado pelo `PanResponder` do item. */}
      <Animated.View pointerEvents="none" style={[styles.ghost, ghostStyle]}>
        <View style={styles.ghostBubble}>
          <Icon name={icon} size={32} color={colors.white} />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  lifted: { zIndex: 100 },
  ghost: {
    position: 'absolute',
    top: 0,
    left: 0,
    alignItems: 'center',
    width: '100%',
  },
  ghostBubble: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9999,
    borderWidth: 2,
    borderColor: colors.white,
    padding: 10,
    shadowColor: colors.black,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    backgroundColor: colors.primary,
  },
});

const itemVariants = tv({
  base: 'min-h-11 min-w-11 items-center justify-center rounded-lg border px-3 py-2',
  variants: {
    selected: {
      true: 'border-primary bg-primary',
      false: 'border-border bg-surface',
    },
  },
  defaultVariants: {
    selected: false,
  },
});
