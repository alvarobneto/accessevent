import { useState } from 'react';
import { router } from 'expo-router';
import { View } from 'react-native';

import { Alert, Button, Card, DateField, Icon, Input, Text } from '@/components/ui';
import type { EventCategory } from '@/data/types';
import { colors } from '@/theme/tokens';
import { EVENT_CATEGORY_OPTIONS } from '@/utils/event-categories';
import { toErrorMessage } from '@/utils/errors';

const NAME_MAX_LENGTH = 120;
const DESCRIPTION_MAX_LENGTH = 2000;
const ADDRESS_MAX_LENGTH = 200;

/** Valores como estão no formulário: as datas são `YYYY-MM-DD`, ou `''`. */
export type EventFormValues = {
  name: string;
  description: string;
  address: string;
  startDate: string;
  endDate: string;
  /** Chave da categoria ou `''` para "sem categoria". */
  category: EventCategory | '';
};

/** Valores prontos para o `AppRepository`: datas em `YYYY-MM-DD` ou `null`. */
export type EventFormSubmission = {
  name: string;
  description: string;
  address: string | null;
  startDate: string | null;
  endDate: string | null;
  category: EventCategory | null;
};

type EventFormProps = {
  initialValues?: Partial<EventFormValues>;
  submitLabel: string;
  submitLoadingLabel: string;
  onSubmit: (values: EventFormSubmission) => Promise<void>;
};

type EventFormErrors = Partial<Record<keyof EventFormValues, string>>;

const EMPTY_VALUES: EventFormValues = {
  name: '',
  description: '',
  address: '',
  startDate: '',
  endDate: '',
  category: '',
};

/**
 * Formulário de evento, compartilhado por "Criar evento" e "Editar evento".
 *
 * As datas vêm do seletor nativo do aparelho já em `YYYY-MM-DD`, o mesmo formato
 * da API, então não existe conversão nem máscara: o campo não aceita texto
 * digitado. A checagem local da ordem das datas existe só para não gastar uma
 * ida ao servidor — a API valida de novo do mesmo jeito.
 */
export function EventForm({
  initialValues,
  submitLabel,
  submitLoadingLabel,
  onSubmit,
}: EventFormProps) {
  const [values, setValues] = useState<EventFormValues>({ ...EMPTY_VALUES, ...initialValues });
  const [errors, setErrors] = useState<EventFormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const setField = <K extends keyof EventFormValues>(field: K, value: EventFormValues[K]) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const validate = (): EventFormErrors => {
    const next: EventFormErrors = {};

    if (!values.name.trim()) {
      next.name = 'Informe o nome do evento.';
    } else if (values.name.trim().length > NAME_MAX_LENGTH) {
      next.name = `O nome do evento deve ter no máximo ${NAME_MAX_LENGTH} caracteres.`;
    }

    if (values.description.trim().length > DESCRIPTION_MAX_LENGTH) {
      next.description = `A descrição deve ter no máximo ${DESCRIPTION_MAX_LENGTH} caracteres.`;
    }

    if (values.address.trim().length > ADDRESS_MAX_LENGTH) {
      next.address = `O endereço deve ter no máximo ${ADDRESS_MAX_LENGTH} caracteres.`;
    }

    // `YYYY-MM-DD` compara como string: mesmo formato, mesma largura, mesma
    // ordem lexicográfica que a do calendário.
    if (values.startDate && values.endDate && values.endDate < values.startDate) {
      next.endDate = 'A data final não pode ser anterior à data inicial.';
    }

    return next;
  };

  const handleSubmit = async () => {
    const found = validate();
    setErrors(found);

    if (Object.keys(found).length > 0) {
      return;
    }

    setSaving(true);
    setSubmitError(null);

    try {
      await onSubmit({
        name: values.name.trim(),
        description: values.description.trim(),
        address: values.address.trim() || null,
        startDate: values.startDate || null,
        endDate: values.endDate || null,
        category: values.category || null,
      });
    } catch (error) {
      setSubmitError(toErrorMessage(error, 'Não foi possível salvar o evento.'));
      setSaving(false);
    }
  };

  return (
    <>
      <Card>
        <Input
          label="Nome do evento"
          value={values.name}
          onChangeText={(value) => setField('name', value)}
          placeholder="Feira de Tecnologia Acessível"
          // A capitalização fica com o aparelho. Reescrever o valor dentro do
          // `onChangeText` desincroniza o texto nativo do valor controlado no
          // iOS, e a próxima tecla entra num deslocamento antigo: digitar "rec"
          // virava "Rrec". `sentences` sobe a primeira letra sem passar por
          // baixo do teclado de novo.
          autoCapitalize="sentences"
          returnKeyType="next"
          errorText={errors.name}
          testID="event-name"
        />

        <Input
          label="Descrição"
          isOptional
          value={values.description}
          onChangeText={(value) => setField('description', value)}
          placeholder="Pavilhões, salas e áreas que fazem parte do evento."
          multiline
          numberOfLines={3}
          errorText={errors.description}
          testID="event-description"
        />

        <Input
          label="Endereço"
          isOptional
          value={values.address}
          onChangeText={(value) => setField('address', value)}
          placeholder="Rua, número, cidade"
          autoCapitalize="words"
          returnKeyType="next"
          errorText={errors.address}
          testID="event-address"
        />
      </Card>

      {/* Categoria: classificação que alimenta o "descubra por categoria". */}
      <Card>
        <Text variant="subheading">Categoria</Text>
        <Text variant="caption">Opcional. Ajuda o participante a encontrar o evento.</Text>

        <View className="flex-row flex-wrap gap-2">
          {EVENT_CATEGORY_OPTIONS.map((option) => {
            const selected = values.category === option.key;
            return (
              <View key={option.key} className="w-[48%] grow">
                <Button
                  label={option.label}
                  variant={selected ? 'solid' : 'outline'}
                  size="sm"
                  onPress={() => setField('category', selected ? '' : option.key)}
                  accessibilityState={{ selected }}
                  accessibilityHint={
                    selected
                      ? 'Categoria selecionada; toque para remover'
                      : 'Seleciona esta categoria'
                  }
                  testID={`event-category-${option.key}`}
                />
              </View>
            );
          })}
        </View>
      </Card>

      <Card>
        <DateField
          label="Data inicial"
          isOptional
          value={values.startDate}
          onChange={(value) => setField('startDate', value)}
          errorText={errors.startDate}
        />

        <DateField
          label="Data final"
          isOptional
          value={values.endDate}
          onChange={(value) => setField('endDate', value)}
          errorText={errors.endDate}
        />
      </Card>

      {submitError ? <Alert tone="error" description={submitError} /> : null}

      <View className="gap-3">
        <Button
          label={submitLabel}
          loading={saving}
          loadingLabel={submitLoadingLabel}
          onPress={() => void handleSubmit()}
          iconStart={saving ? undefined : <Icon name="check" size={20} color={colors.background} />}
          testID="submit-event"
        />

        <Button label="Cancelar" variant="ghost" onPress={() => router.back()} />
      </View>
    </>
  );
}

/** Converte um evento da API nos valores iniciais do formulário. */
export function toEventFormValues(event: {
  name: string;
  description: string | null;
  address: string | null;
  startDate: string | null;
  endDate: string | null;
  category: EventCategory | null;
}): EventFormValues {
  return {
    name: event.name,
    description: event.description ?? '',
    address: event.address ?? '',
    startDate: event.startDate ?? '',
    endDate: event.endDate ?? '',
    category: event.category ?? '',
  };
}
