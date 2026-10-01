import { useState } from 'react';
import { DateTimePicker } from '@expo/ui/community/datetime-picker';
import { Modal, Platform, Pressable, View } from 'react-native';

import { colors } from '@/theme/tokens';
import { formatIsoDate, fromIsoDate, toIsoDate } from '@/utils/format';

import { tv } from '../../lib/tv';

import { Button } from './button';
import { Icon } from './icon';
import { Text } from './text';

type DateFieldProps = {
  label: string;
  helperText?: string;
  errorText?: string;
  isOptional?: boolean;
  /** `YYYY-MM-DD`, ou string vazia quando o usuário ainda não escolheu uma data. */
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  containerClassName?: string;
};

/**
 * Campo de data que abre o seletor nativo do aparelho.
 *
 * O valor trafega em `YYYY-MM-DD` — o mesmo formato da API — e vira `Date` só na
 * hora de mostrar o calendário. Não há máscara nem `TextInput`: digitar data à mão
 * é o que produz `31/02`, e o seletor nativo nunca deixa isso acontecer.
 *
 * As duas plataformas precisam de presentation diferente. No Android o
 * `presentation="dialog"` já abre a janela do sistema quando o componente monta e
 * manda `onValueChange`/`onDismiss`, então basta desmontar. No iOS o seletor é
 * sempre inline, então ele vive num `Modal` nosso com "Limpar" e "Concluir" — sem
 * eles não haveria como fechar, nem como limpar um campo opcional.
 *
 * **Este campo não restringe o calendário** (`minimumDate`/`maximumDate` ficam de
 * fora de propósito). No `DateTimePicker` do `@expo/ui` essas props viram o
 * `range` do `DatePicker` do SwiftUI, e um `range` transforma o calendário num
 * seletor de intervalo com duas alças. A ordem das datas é regra do formulário e
 * fica na validação, onde o usuário recebe o mesmo recado nas duas plataformas.
 */
export function DateField({
  label,
  helperText,
  errorText,
  isOptional,
  value,
  onChange,
  placeholder = 'dd/mm/aaaa',
  className,
  containerClassName,
}: DateFieldProps) {
  const [open, setOpen] = useState(false);
  const hasError = Boolean(errorText);
  const helper = hasError ? errorText : helperText;
  const shown = value ? formatIsoDate(value) : undefined;
  const selected = fromIsoDate(value) ?? new Date();

  const close = () => setOpen(false);

  return (
    <View className={containerClassName ?? 'gap-2'}>
      <View className="flex-row items-baseline justify-between gap-2">
        <Text variant="label">{label}</Text>
        {isOptional ? <Text variant="caption">Opcional</Text> : null}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={shown ? `${label}. ${shown}` : `${label}. Sem data`}
        aria-invalid={hasError}
        onPress={() => setOpen(true)}
        className={fieldVariants({ invalid: hasError })}
      >
        <View className="flex-1">
          <Text className={className} tint={shown ? 'default' : 'muted'}>
            {shown ?? placeholder}
          </Text>
        </View>

        <Icon name="calendar-blank-outline" size={20} color={colors.gray400} />
      </Pressable>

      {helper ? (
        <Text variant="caption" tint={hasError ? 'danger' : 'muted'}>
          {helper}
        </Text>
      ) : null}

      {open && Platform.OS === 'android' ? (
        <DateTimePicker
          value={selected}
          mode="date"
          presentation="dialog"
          accentColor={colors.primary}
          onValueChange={(_event, date) => {
            onChange(toIsoDate(date));
            close();
          }}
          onDismiss={close}
        />
      ) : null}

      {open && Platform.OS === 'ios' ? (
        <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={close}>
          <Pressable
            accessibilityLabel="Fechar o calendário"
            accessibilityRole="button"
            onPress={close}
            className="flex-1 items-center justify-center bg-gray-900/40 px-6 py-10"
          >
            <Pressable
              accessibilityViewIsModal
              onPress={(event) => event.stopPropagation()}
              className="w-full max-w-md gap-4 rounded-xl border border-border bg-background p-4"
            >
              <DateTimePicker
                value={selected}
                mode="date"
                display="inline"
                accentColor={colors.primary}
                locale="pt_BR"
                onValueChange={(_event, date) => onChange(toIsoDate(date))}
              />

              <View className="flex-row gap-3">
                {value ? (
                  <Button label="Limpar" variant="ghost" onPress={() => onChange('')} />
                ) : null}
                <Button label="Concluir" variant="solid" className="flex-1" onPress={close} />
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}
    </View>
  );
}

const fieldVariants = tv({
  base: 'min-h-14 flex-row items-center gap-2 rounded-md border border-border bg-background px-3 py-3',
  variants: {
    /** `design.md` Inputs: erro com `borderColor: error`. */
    invalid: { true: 'border-error' },
  },
});
