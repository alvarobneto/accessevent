import type { ReactNode } from 'react';
import { Pressable, View, type PressableProps, type ViewProps } from 'react-native';

import { tv, type VariantProps } from '../../lib/tv';

import { Spinner } from './spinner';
import { Text } from './text';

type ButtonProps = Omit<PressableProps, 'children' | 'style'> &
  VariantProps<typeof buttonVariants> & {
    label: string;
    /** Texto exibido enquanto `loading` é verdadeiro. */
    loadingLabel?: string;
    loading?: boolean;
    fullWidth?: boolean;
    iconStart?: ReactNode;
    iconEnd?: ReactNode;
    /** Rótulo lido por leitores de tela quando o texto visível não basta. */
    accessibilityLabel?: string;
    className?: string;
    textClassName?: string;
    containerProps?: ViewProps;
  };

/**
 * Botão do app: alvo de toque grande, realce no toque e estado de carregamento
 * embutido.
 *
 * `variant` e `size` têm padrão aqui, e não só em `buttonVariants.defaultVariants`.
 * As variantes compostas recebem os valores crus: se o padrão vivesse apenas no
 * `tv()`, `contentVariants` e `labelVariants` receberiam `undefined` e perderiam
 * a altura mínima e a cor do rótulo — foi o que aconteceu na primeira versão
 * deste componente.
 *
 * A altura útil vem do `size`: 48px no compacto, 52px no médio e 56px no padrão,
 * todos acima ou iguais ao alvo ideal de 48px do `design.md` e nunca menores que
 * os botões de 48px do cabeçalho. Os cinco `variant` cobrem Primary, Secondary,
 * Outline, Ghost e Danger.
 */
export function Button({
  label,
  loadingLabel,
  loading = false,
  fullWidth,
  iconStart,
  iconEnd,
  variant = 'solid',
  size = 'lg',
  disabled,
  accessibilityLabel,
  className,
  textClassName,
  containerProps,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const isSolid = variant === 'solid' || variant === 'danger';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(isDisabled), busy: loading }}
      accessibilityLabel={accessibilityLabel ?? label}
      disabled={isDisabled}
      className={buttonVariants({ variant, size, fullWidth, disabled: isDisabled, className })}
      {...props}
    >
      {({ pressed }) => (
        <View
          className={contentVariants({ size, pressed })}
          {...containerProps}
          pointerEvents="none"
        >
          {loading ? <Spinner size="sm" inverse={isSolid} /> : iconStart}
          <Text className={labelVariants({ variant, size, className: textClassName })}>
            {loading ? (loadingLabel ?? label) : label}
          </Text>
          {!loading && iconEnd}
        </View>
      )}
    </Pressable>
  );
}

const buttonVariants = tv({
  base: 'rounded-md',
  variants: {
    variant: {
      /** Primary: fundo azul, texto branco. */
      solid: 'bg-primary active:bg-primary-700',
      /** Secondary: fundo azul claro, texto azul escuro. */
      soft: 'bg-primary-50 active:bg-primary-100',
      outline: 'border border-border bg-background active:bg-gray-50',
      /** Ghost: sem fundo, texto azul. */
      ghost: 'bg-transparent active:bg-gray-100',
      /** Danger: fundo vermelho, texto branco. */
      danger: 'bg-error active:opacity-90',
    },
    size: {
      sm: 'px-3',
      md: 'px-4',
      lg: 'px-5',
    },
    fullWidth: { true: 'w-full' },
    disabled: { true: 'opacity-40' },
  },
  defaultVariants: {
    variant: 'solid',
    size: 'lg',
  },
});

const contentVariants = tv({
  base: 'flex-row items-center justify-center gap-2 px-1',
  variants: {
    size: {
      sm: 'min-h-12',
      md: 'min-h-13',
      lg: 'min-h-14',
    },
    pressed: { true: 'opacity-90' },
  },
});

const labelVariants = tv({
  base: 'font-semibold',
  variants: {
    variant: {
      solid: 'text-white',
      danger: 'text-white',
      soft: 'text-primary-700',
      outline: 'text-content',
      ghost: 'text-primary-700',
    },
    size: {
      sm: 'text-caption',
      md: 'text-body',
      lg: 'text-body',
    },
  },
});
