import { View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { colors } from '@/theme/tokens';
import type { MapTone } from '@/types/map';

import { tv } from '../../lib/tv';

type MapPinProps = {
  tone?: MapTone;
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
 * O pino ainda não é tocável — a seleção de ponto chega na Sprint 6 —, então o
 * `p-2` em volta do disco não é alvo de toque, é respiro entre pinos vizinhos.
 * `size-8` e os 4px do anel seguem a grade do `design.md`.
 */
export function MapPin({ tone = 'default', className }: MapPinProps) {
  return (
    <View className={pinVariants({ className })}>
      <View className={discVariants({ tone })}>
        <Icon name="map-marker" size={20} color={colors.white} />
      </View>
    </View>
  );
}

const pinVariants = tv({
  base: 'items-center justify-center p-2',
});

const discVariants = tv({
  base: 'size-8 items-center justify-center rounded-full border-2 border-white shadow-md',
  variants: {
    tone: {
      default: 'bg-primary',
      highlight: 'bg-success-strong',
      muted: 'bg-gray-500',
    },
  },
  defaultVariants: {
    tone: 'default',
  },
});
