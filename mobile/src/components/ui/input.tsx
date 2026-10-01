import { useState, type ReactNode } from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';

import { colors } from '@/theme/tokens';

import { tv, type VariantProps } from '../../lib/tv';

import { Text } from './text';

type FieldProps = {
  label: string;
  helperText?: string;
  errorText?: string;
  isOptional?: boolean;
};

type InputProps = TextInputProps &
  VariantProps<typeof inputVariants> &
  FieldProps & {
    startIcon?: ReactNode;
    className?: string;
    containerClassName?: string;
  };

/**
 * Campo de texto: rótulo, dica e erro sempre no mesmo lugar.
 *
 * `size` tem padrão aqui, e não só em `fieldVariants.defaultVariants`: as duas
 * variantes compostas recebem o valor cru, e sem o padrão `inputVariants`
 * perderia o padding vertical.
 *
 * O `design.md` pede quatro estados — default, focus, error e disabled. Focus e
 * error viram borda colorida; disabled reusa `opacity-40` do `Button`, que é o
 * mesmo sinal visual de "não disponível" em toda a interface.
 */
export function Input({
  label,
  helperText,
  errorText,
  isOptional,
  startIcon,
  className,
  containerClassName,
  size = 'lg',
  multiline,
  onFocus,
  onBlur,
  value,
  disabled,
  ...props
}: InputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const hasError = Boolean(errorText);
  const helper = hasError ? errorText : helperText;

  return (
    <View className={containerClassName ?? 'gap-2'}>
      <View className="flex-row items-baseline justify-between gap-2">
        <Text variant="label">{label}</Text>
        {isOptional ? <Text variant="caption">Opcional</Text> : null}
      </View>

      <View
        className={fieldVariants({
          size,
          focused: isFocused && !hasError && !disabled,
          invalid: hasError,
          disabled,
        })}
      >
        {startIcon ? <View className="pr-1">{startIcon}</View> : null}
        <TextInput
          accessibilityLabel={label}
          aria-invalid={hasError}
          aria-disabled={disabled}
          editable={!disabled}
          placeholderTextColor={colors.gray400}
          selectionColor={colors.primary}
          value={value}
          multiline={multiline}
          onFocus={(event) => {
            setIsFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setIsFocused(false);
            onBlur?.(event);
          }}
          className={inputVariants({ size, multiline, disabled, className })}
          {...props}
        />
      </View>

      {helper ? (
        <Text variant="caption" tint={hasError ? 'danger' : 'muted'}>
          {helper}
        </Text>
      ) : null}
    </View>
  );
}

const fieldVariants = tv({
  base: 'flex-row items-center gap-2 rounded-md border bg-background px-3',
  variants: {
    size: {
      /** 48px — o alvo de toque ideal do `design.md`. */
      sm: 'min-h-12',
      md: 'min-h-13',
      lg: 'min-h-14',
    },
    /** `design.md` Inputs: focus com `borderColor: primary`. */
    focused: { true: 'border-primary' },
    /** `design.md` Inputs: erro com `borderColor: error`. */
    invalid: { true: 'border-error' },
    disabled: { true: 'opacity-40' },
  },
  defaultVariants: {
    size: 'lg',
  },
});

const inputVariants = tv({
  /**
   * `text-body` traz o lineHeight do token (16/24). Num `TextInput` de linha
   * única no iOS esse lineHeight maior que a fonte desalinha os glifos
   * verticalmente dentro da caixa, e o desvio fica mais visível quando o campo
   * entra em foco, porque o iOS recalcula o container de texto nesse momento.
   * `leading-none` deixa a caixa de linha do tamanho da fonte, que é o que
   * centraliza de fato. No `multiline` voltamos a `leading-normal`, que em 16px
   * dá 24px — o mesmo lineHeight do token, então a leitura do texto longo não
   * fica apertada.
   *
   * `min-h-11` (44px) é o piso de alvo de toque do RNF04: sem ele, trocar o
   * lineHeight de 24px por 16px derrubaria o campo de 48px para 40px.
   */
  base: 'flex-1 min-h-11 font-regular text-body leading-none text-content',
  variants: {
    size: {
      sm: 'py-1',
      md: 'py-2',
      lg: 'py-3',
    },
    multiline: {
      true: 'py-3 leading-normal',
    },
    disabled: { true: 'opacity-40' },
  },
});
