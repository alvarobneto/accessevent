import { useState } from 'react';
import { View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';

import { AsyncContent } from '@/components/async-content';
import { Screen } from '@/components/screen';
import { Section } from '@/components/section';
import { Alert, Button, Card, EmptyState, Input, Text } from '@/components/ui';
import { repository } from '@/data';
import type { Path } from '@/data/types';
import { useAsyncData } from '@/hooks/useAsyncData';
import { toErrorMessage } from '@/utils/errors';
import { formatDateTime, formatDistance } from '@/utils/format';

/**
 * Limite do nome, o mesmo que a API valida.
 *
 * O `maxLength` do campo não é decoração: sem ele a pessoa digita o nome inteiro
 * e só descobre que é longo demais quando o `PATCH` volta 400 — o erro do backend
 * não é ruim, mas chega tarde. 120 é o `name_max_length` do `IsBoundedName`.
 */
const NAME_MAX_LENGTH = 120;

/**
 * Editar caminho: dar nome ao trajeto que o organizador percorreu.
 *
 * É uma tela à parte, e não um campo no hub, porque o hub mostra o mapa inteiro:
 * editar ali empurraria o desenho e a lista de caminhos para baixo a cada tecla.
 * Ela é aberta pela linha da lista ou pelo próprio trajeto no mapa.
 *
 * **Só o nome.** A geometria vem da gravação (Sprint 4) e os atributos de
 * acessibilidade são da Sprint 9; mexer neles aqui seria um editor de vértices que
 * não existe. Por isso a tela mostra o caminho como contexto — distância, pontos e
 * data — e nenhum deles é editável aqui.
 *
 * O botão "Salvar alterações" é explícito, e não salvar ao digitar: o nome é do
 * organizador e ele decide quando ele está bom, o mesmo combinado do editor de
 * título da navegação.
 */
export default function EditPathScreen() {
  const { pathId } = useLocalSearchParams<{ pathId: string }>();
  const id = pathId ?? '';

  const path = useAsyncData(() => repository.getPath(id), id);

  return (
    <>
      <Stack.Screen options={{ title: 'Editar caminho' }} />

      <Screen scrollable testID="edit-path-screen">
        <AsyncContent state={path.state} onRetry={path.reload} loadingLabel="Carregando o caminho…">
          {(data) => (data ? <PathEditor key={data.id} path={data} /> : <PathNotFound />)}
        </AsyncContent>
      </Screen>
    </>
  );
}

/**
 * Caminho apagado enquanto a tela estava aberta.
 *
 * O `getPath` devolve `null` em 404 e a tela existia porque o caminho estava lá
 * quando foi aberta, então a pessoa precisa de uma saída — e voltar ao mapa é a
 * única que faz sentido.
 */
function PathNotFound() {
  return (
    <EmptyState
      icon="vector-polyline"
      title="Caminho não encontrado"
      description="Ele pode ter sido apagado desde que esta tela foi aberta."
    >
      <Button label="Voltar ao mapa" variant="outline" onPress={() => router.back()} />
    </EmptyState>
  );
}

type PathEditorProps = {
  path: Path;
};

function PathEditor({ path }: PathEditorProps) {
  const [name, setName] = useState(path.name ?? '');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    const trimmedName = name.trim();

    if (!trimmedName) {
      setError('Informe um nome para o caminho.');
      return;
    }

    setSaving(true);
    setError(null);
    setFeedback(null);

    try {
      await repository.updatePath(path.id, { name: trimmedName });
      setFeedback('Nome salvo.');
    } catch (saveError) {
      setError(toErrorMessage(saveError, 'Não foi possível salvar o nome do caminho.'));
    } finally {
      setSaving(false);
    }
  };

  const pointLabel = path.geometry.length === 1 ? 'ponto' : 'pontos';

  return (
    <>
      <Card>
        <Input
          label="Nome do caminho"
          value={name}
          onChangeText={(value) => {
            setName(value);
            setFeedback(null);
            setError(null);
          }}
          placeholder="Corredor do térreo até o palco"
          helperText="É como este caminho aparece na lista e no mapa."
          autoCapitalize="sentences"
          maxLength={NAME_MAX_LENGTH}
          errorText={error ?? undefined}
          testID="path-name"
        />

        {feedback ? <Alert tone="success" title="Nome salvo" description={feedback} /> : null}

        <Button
          label="Salvar alterações"
          loading={saving}
          loadingLabel="Salvando…"
          onPress={() => void handleSave()}
          fullWidth
          testID="submit-path-name"
        />
      </Card>

      <Section title="O que este caminho é" description="Gravado por você; aqui só o nome muda.">
        <Card variant="soft">
          <View className="gap-2">
            <Text variant="body">Distância de {formatDistance(path.distance)}</Text>
            <Text variant="caption">
              {path.geometry.length} {pointLabel} no trajeto
            </Text>
            <Text variant="caption">Gravado em {formatDateTime(path.createdAt)}</Text>
          </View>
        </Card>
      </Section>

      <Button label="Voltar ao mapa" variant="ghost" onPress={() => router.back()} />
    </>
  );
}
