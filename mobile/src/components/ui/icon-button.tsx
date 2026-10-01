import { Pressable, type PressableProps } from 'react-native';

import { tv, type VariantProps } from '../../lib/tv';

import { Icon, type IconName } from './icon';

type IconButtonProps = Omit<PressableProps, 'children' | 'style'> &
  VariantProps<typeof iconButtonVariants> & {
    icon: IconName;
    /** Obrigatório: sem texto visível, é o rótulo lido por leitores de tela. */
    accessibilityLabel: string;
    className?: string;
  };

/**
 * Botão só de ícone, usado nos cabeçalhos das seções.
 *
 * Os dois tamanhos são 44px e 48px — o mínimo e o ideal do `design.md` —, então o
 * alvo de toque nunca cai abaixo de 44x44 mesmo com o ícone de 20px (RNF04).
 */
export function IconButton({
  icon,
  accessibilityLabel,
  variant,
  size,
  disabled,
  className,
  ...props
}: IconButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      hitSlop={6}
      className={iconButtonVariants({ variant, size, disabled: Boolean(disabled), className })}
      {...props}
    >
      <Icon name={icon} size={size === 'sm' ? 20 : 24} />
    </Pressable>
  );
}

const iconButtonVariants = tv({
  base: 'items-center justify-center rounded-full active:opacity-60',
  variants: {
    variant: {
      ghost: 'bg-transparent',
      soft: 'bg-primary-50 active:bg-primary-100',
    },
    size: {
      /** 44px — o mínimo do `design.md`. */
      sm: 'size-11',
      /** 48px — o alvo ideal do `design.md`. */
      md: 'size-12',
    },
    disabled: { true: 'opacity-40' },
  },
  defaultVariants: {
    variant: 'ghost',
    size: 'md',
  },
});
