import { View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { colors } from '@/theme/tokens';
import type { IconName } from '@/types/icon';
import type { MapTone } from '@/types/map';

import { tv } from '../../lib/tv';

type MapPinProps = {
  tone?: MapTone;
  /**
   * Ícone do ponto que este pino marca.
   *
   * Vem do tipo do `PointOfInterest`. Sem ele o pino é o genérico, que é o que
   * o ponto em rascunho e o contexto sem tipo usam — e o que o mapa mostra quando
   * ainda não se sabe o que é o ponto.
   */
  icon?: IconName;
  className?: string;
};

/**
 * O pino que desenha o marcador no mapa.
 *
 * É um disco com anel branco em vez do pino do sistema: os dois pinos nativos
 * (Apple Maps e Google Maps) têm formatos, cores e tamanhos diferentes, e o
 * `design.md` pede uma interface consistente entre plataformas. O anel branco
 * separa o pino do desenho do mapa, que é claro ou escuro dependendo do PROVIDER.
 *
 * **O disco é maior quando o pino é de um tipo com ícone.** Com um desenho de 20px
 * dentro do disco de 32px sobram 6px de respiro, e o pino de `Banheiro acessível`
 * fica indistinguível do de `Banheiro` quando os dois cabem em 32px. Por isso o
 * pino com ícone usa `size-11`: o alvo e a leitura do tipo ganham o mesmo
 * desconto. `size-8` e os 4px do anel seguem a grade do `design.md` para o caso
 * genérico.
 *
 * `tracksViewChanges` é `false` no `EventMap` porque o pino é estático; o conteúdo
 * é derivado do ponto e muda só quando o ponto muda.
 */
export function MapPin({ tone = 'default', icon, className }: MapPinProps) {
  return (
    <View className={pinVariants({ className })}>
      <View className={discVariants({ tone, size: icon ? 'icon' : 'default' })}>
        <Icon name={icon ?? 'map-marker'} size={icon ? 24 : 20} color={colors.white} />
      </View>
    </View>
  );
}

const pinVariants = tv({
  base: 'items-center justify-center p-2',
});

const discVariants = tv({
  base: 'items-center justify-center rounded-full border-2 border-white shadow-md',
  variants: {
    size: {
      default: 'size-8',
      icon: 'size-11',
    },
    tone: {
      default: 'bg-primary',
      highlight: 'bg-success-strong',
      muted: 'bg-gray-500',
    },
  },
  defaultVariants: {
    size: 'default',
    tone: 'default',
  },
});
