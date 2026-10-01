import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';

import { AsyncContent } from '@/components/async-content';
import { Screen } from '@/components/screen';
import { Alert, Button, Card, EmptyState, Input } from '@/components/ui';
import { repository } from '@/data';
import { useAsyncData } from '@/hooks/useAsyncData';
import { toErrorMessage } from '@/utils/errors';

/**
 * Editar Navegação: só o título, por enquanto. A estrutura do mapa (pontos de
 * interesse, conexões e desenho) entra nas próximas fases.
 *
 * O editor é uma tela à parte justamente porque a navegação se abre pela lista:
 * quem chega aqui escolheu editar, e por isso não repete o resumo nem o menu da
 * tela anterior.
 */
export default function EditNavigationMapScreen() {
  const { mapId } = useLocalSearchParams<{ mapId: string }>();
  const id = mapId ?? '';

  const { state, reload } = useAsyncData(() => repository.getNavigationMap(id), id);

  return (
    <Screen scrollable testID="edit-navigation-map-screen">
      <AsyncContent state={state} onRetry={reload} loadingLabel="Carregando a navegação…">
        {(data) =>
          data ? (
            <NavigationTitleCard
              key={data.id}
              mapId={id}
              initialTitle={data.name}
              onSaved={reload}
            />
          ) : (
            <EmptyState
              icon="map-search-outline"
              title="Navegação não encontrada"
              description="Ela pode ter sido removida desde que esta tela foi aberta."
            >
              <Button label="Voltar" variant="outline" onPress={() => router.back()} />
            </EmptyState>
          )
        }
      </AsyncContent>
    </Screen>
  );
}

type NavigationTitleCardProps = {
  mapId: string;
  initialTitle: string;
  onSaved: () => void;
};

function NavigationTitleCard({ mapId, initialTitle, onSaved }: NavigationTitleCardProps) {
  const [title, setTitle] = useState(initialTitle);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRename = async () => {
    const trimmedTitle = title.trim();

    if (!trimmedTitle) {
      setError('Informe o título da navegação.');
      return;
    }

    setSaving(true);
    setError(null);
    setFeedback(null);

    try {
      await repository.renameNavigationMap(mapId, trimmedTitle);
      setFeedback('Título salvo.');
      onSaved();
    } catch (renameError) {
      setError(toErrorMessage(renameError, 'Não foi possível salvar o título.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <Input
        label="Título da navegação"
        value={title}
        onChangeText={(value) => {
          setTitle(value);
          setFeedback(null);
          setError(null);
        }}
        placeholder="Primeiro Andar"
        autoCapitalize="sentences"
        errorText={error ?? undefined}
        testID="map-title"
      />

      {feedback ? <Alert tone="success" title="Título salvo" description={feedback} /> : null}

      <Button
        label="Salvar título"
        loading={saving}
        loadingLabel="Salvando…"
        onPress={() => void handleRename()}
        testID="submit-rename"
      />
    </Card>
  );
}
