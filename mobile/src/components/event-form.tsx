import { useState } from 'react';
import { router } from 'expo-router';
import { View } from 'react-native';

import { Alert, Button, Card, Icon, Input } from '@/components/ui';
import { colors } from '@/theme/tokens';
import { toErrorMessage } from '@/utils/errors';
import { formatIsoDate, maskBrDate, parseBrDate } from '@/utils/format';

const NAME_MAX_LENGTH = 120;
const DESCRIPTION_MAX_LENGTH = 2000;
const ADDRESS_MAX_LENGTH = 200;

/** Valores como estão no formulário: as datas são `dd/mm/aaaa`. */
export type EventFormValues = {
  name: string;
  description: string;
  address: string;
  startDate: string;
  endDate: string;
};

/** Valores prontos para o `AppRepository`: datas em `YYYY-MM-DD` ou `null`. */
export type EventFormSubmission = {
  name: string;
  description: string;
  address: string | null;
  startDate: string | null;
  endDate: string | null;
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
};

/**
 * Formulário de evento, compartilhado por "Criar evento" e "Editar evento".
 *
 * A data é digitada como `dd/mm/aaaa`, que é o formato que o usuário brasileiro
 * lê sem esforço, e convertida para `YYYY-MM-DD` só na submissão. A API valida
 * de novo do mesmo jeito: a checagem local existe para não gastar uma ida ao
 * servidor, não para substituir a regra.
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

    const startDate = values.startDate.trim() ? parseBrDate(values.startDate) : null;
    const endDate = values.endDate.trim() ? parseBrDate(values.endDate) : null;

    if (values.startDate.trim() && !startDate) {
      next.startDate = 'Informe a data no formato dd/mm/aaaa. Exemplo: 05/10/2026.';
    }

    if (values.endDate.trim() && !endDate) {
      next.endDate = 'Informe a data no formato dd/mm/aaaa. Exemplo: 05/10/2026.';
    }

    if (startDate && endDate && endDate < startDate) {
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
        startDate: values.startDate.trim() ? parseBrDate(values.startDate) : null,
        endDate: values.endDate.trim() ? parseBrDate(values.endDate) : null,
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
          onChangeText={(value) =>
            // Só a primeira letra sobe: deixar o resto em minúsculas impede
            // digitar "Feira de Tecnologia".
            setField('name', value.charAt(0).toUpperCase() + value.slice(1))
          }
          placeholder="Feira de Tecnologia Acessível"
          autoCapitalize="none"
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

      <Card>
        <Input
          label="Data inicial"
          isOptional
          value={values.startDate}
          onChangeText={(value) => setField('startDate', maskBrDate(value))}
          placeholder="dd/mm/aaaa"
          keyboardType="number-pad"
          errorText={errors.startDate}
          testID="event-start-date"
        />

        <Input
          label="Data final"
          isOptional
          value={values.endDate}
          onChangeText={(value) => setField('endDate', maskBrDate(value))}
          placeholder="dd/mm/aaaa"
          keyboardType="number-pad"
          errorText={errors.endDate}
          testID="event-end-date"
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
}): EventFormValues {
  return {
    name: event.name,
    description: event.description ?? '',
    address: event.address ?? '',
    startDate: formatIsoDate(event.startDate) ?? '',
    endDate: formatIsoDate(event.endDate) ?? '',
  };
}
