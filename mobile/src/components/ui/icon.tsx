import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ComponentProps } from 'react';

import { colors } from '@/theme/tokens';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

type IconProps = {
  name: IconName;
  /** Só os três tamanhos do `design.md`: 20, 24 e 32. */
  size?: 20 | 24 | 32;
  /**
   * Cor do ícone. Recebe um token de cor literal do `tailwind.config.js`
   * (`content`, `muted`, `primary`…), nunca um hex escrito à mão — por isso este
   * componente concentra o único ponto do app que resolve token para valor de
   * estilo nativo.
   */
  color?: string;
  className?: string;
  accessibilityLabel?: string;
};

/** Ícone único do app: Material Community Icons, sempre com o mesmo traço. */
export function Icon({
  name,
  size = 20,
  color = colors.content,
  className,
  accessibilityLabel,
}: IconProps) {
  return (
    <MaterialCommunityIcons
      name={name}
      size={size}
      color={color}
      className={className}
      accessibilityLabel={accessibilityLabel}
      aria-hidden={accessibilityLabel ? undefined : true}
    />
  );
}

export type { IconName };
