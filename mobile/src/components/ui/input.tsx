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
    /** Altura do campo: 48px, 52px ou 56px. É `fieldVariants` que a aplica. */
    size?: 'sm' | 'md' | 'lg';
  };

/**
 * Campo de texto: rótulo, dica e erro sempre no mesmo lugar.
 *
 * `size` tem padrão aqui, e não só em `fieldVariants.defaultVariants`: as
 * variantes compostas recebem o valor cru, e sem o padrão o campo perderia a
 * altura do `design.md`. O `TextInput` não recebe mais `size` — a altura é do
 * campo, e ele preenche a caixa toda.
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
          multiline,
          focused: isFocused && !hasError && !disabled,
          invalid: hasError,
          disabled,
        })}
      >
        {startIcon ? <View className="self-center pr-1">{startIcon}</View> : null}
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
          className={inputVariants({ multiline, disabled, className })}
          style={{ textAlignVertical: multiline ? 'top' : 'center', includeFontPadding: false }}
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
    /**
     * Texto longo cresce para baixo e começa no topo. O padding vertical fica
     * no campo, não no `TextInput`: é o mesmo lugar do `px-3`, e o controle
     * nativo continua com `textAlignVertical: 'top'` nesses campos.
     */
    multiline: { true: 'items-start py-3' },
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
   * **Sem `line-height` em campo de linha única, e o placeholder é o motivo.**
   * `text-body` traz 16/24, e no iOS o `line-height` maior que a fonte faz o
   * UIKit ancorar o placeholder no fundo da caixa de linha enquanto o texto
   * digitado é centralizado na altura natural da fonte — os dois em alturas
   * diferentes. `leading-none` não resolvia: `1` vira `1em`, ou seja 16px, e
   * 16px ainda é um `line-height` explícito para o UIKit posicionar. A saída é
   * não declarar nenhum: `text-bodyInput` no `tailwind.config.js` é o mesmo
   * 16px do `body` sem a altura de linha, então o `UITextField` centraliza
   * glifo, cursor e placeholder na mesma altura natural da fonte.
   *
   * O `TextInput` também não usa padding vertical: ele ocupa a altura inteira do
   * campo (`self-stretch`) e quem centraliza é o próprio controle nativo, com
   * `textAlignVertical: 'center'` no Android. Padding vertical aqui era o que
   * deixava folga de um lado só.
   *
   * `min-h-11` (44px) é o piso de alvo de toque do RNF04, abaixo das alturas de
   * campo do `design.md` (48/52/56px), então nunca chega a mandar na altura.
   */
  base: 'flex-1 min-h-11 self-stretch font-regular text-bodyInput text-content',
  variants: {
    multiline: {
      /**
       * Texto longo precisa do lineHeight do token (16/24) para a leitura não
       * ficar apertada, e aqui o placeholder usa a mesma caixa de linha do
       * texto, então os dois continuam alinhados. O padding e o topo ficam no
       * `fieldVariants`.
       */
      true: 'leading-normal',
    },
    disabled: { true: 'opacity-40' },
  },
});
