import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';

import { Screen } from '@/components/screen';
import { Alert, Button, Card, Icon, Input, Text } from '@/components/ui';
import { repository } from '@/data';
import { colors } from '@/theme/tokens';
import { toErrorMessage } from '@/utils/errors';

/** Criar Navegação: um novo mapa associado ao evento (andar, bloco, área externa). */
export default function NewNavigationMapScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const id = eventId ?? '';

  const [name, setName] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    const trimmedName = name.trim();

    if (!trimmedName) {
      setNameError('Informe o título da navegação.');
      return;
    }

    setSaving(true);
    setSubmitError(null);

    try {
      const map = await repository.createNavigationMap({ eventId: id, name: trimmedName });
      router.replace(`/organizer/map/${map.id}`);
    } catch (error) {
      setSubmitError(toErrorMessage(error, 'Não foi possível criar a navegação.'));
      setSaving(false);
    }
  };

  return (
    <Screen scrollable testID="new-navigation-map-screen">
      <Text variant="callout">
        Depois de criada, você monta os cômodos, marca os pontos de interesse e conecta os caminhos
        dentro dela.
      </Text>

      <Card>
        <Input
          label="Título"
          value={name}
          onChangeText={(value) => {
            setName(value);
            setNameError(null);
          }}
          placeholder="Primeiro Andar"
          autoCapitalize="sentences"
          helperText="Ex.: Primeiro Andar, Segundo Andar, Bloco A, Área Externa."
          errorText={nameError ?? undefined}
          testID="map-name"
        />
      </Card>

      {submitError ? (
        <Alert tone="error" title="Não foi possível criar a navegação" description={submitError} />
      ) : null}

      <Button
        label="Criar navegação"
        loading={saving}
        loadingLabel="Criando…"
        onPress={() => void handleCreate()}
        iconStart={saving ? undefined : <Icon name="check" size={20} color={colors.background} />}
        testID="submit-map"
      />

      <Button label="Cancelar" variant="ghost" onPress={() => router.back()} />
    </Screen>
  );
}
