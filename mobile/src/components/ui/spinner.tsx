import { ActivityIndicator } from 'react-native';

import { colors } from '@/theme/tokens';

type SpinnerProps = {
  /**
   * O `ActivityIndicator` do React Native só aceita `small` ou `large` — não há
   * tamanho em pixel, e `className` não muda nada aqui. O prop existe para o
   * spinner ter a mesma vocabulary de tamanho do resto da interface.
   */
  size?: 'sm' | 'md' | 'lg';
  /** Para o botão azul e para fundos escuros, onde o azul da marca some. */
  inverse?: boolean;
};

/**
 * Indicador de progresso: fino e discreto, sem pular layout.
 *
 * Sem `tv()` de propósito: um bloco de variantes cujas classes são todas vazias
 * não compensa a indireção, e o tamanho real vem da prop `size` da
 * `ActivityIndicator`, não de uma utilitária de classe.
 */
export function Spinner({ size = 'md', inverse }: SpinnerProps) {
  return (
    <ActivityIndicator
      accessibilityRole="progressbar"
      color={inverse ? colors.background : colors.primary}
      size={size === 'sm' ? 'small' : 'large'}
    />
  );
}
