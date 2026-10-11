import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { AsyncContent } from '@/components/async-content';
import { Screen } from '@/components/screen';
import { Section } from '@/components/section';
import { Alert, Button, Card, EmptyState, Icon, Input } from '@/components/ui';
import { repository } from '@/data';
import { useAsyncData } from '@/hooks/useAsyncData';
import { useRefreshOnFocus } from '@/hooks/useRefreshOnFocus';
import { colors } from '@/theme/tokens';
import { toErrorMessage } from '@/utils/errors';

/**
 * Editar navegação: o que se faz com o mapa, num lugar só.
 *
 * O hub virou consulta — mostra o desenho e as listas — e esta tela concentra as
 * três portas de edição da navegação: renomear, ajustar um trajeto já gravado,
 * gravar um caminho novo e marcar um ponto de interesse. Três botões espalhados
 * no hub competiam com o mapa; aqui a pessoa já veio de propósito.
 *
 * O card de título veio do antigo `/organizer/map/[mapId]`, que era só o rename
 * com outro caminho: um editor que nada mais fazia não precisa mais de rota
 * própria, e o caminho do menu ("Editar navegação") passou a apontar para cá.
 */
export default function EditNavigationMapScreen() {
  const { eventId, mapId } = useLocalSearchParams<{ eventId: string; mapId: string }>();
  const id = mapId ?? '';

  const map = useAsyncData(() => repository.getNavigationMap(id), id);

  useRefreshOnFocus(map.reload);

  return (
    <>
      <Stack.Screen options={{ title: 'Editar navegação' }} />

      <Screen scrollable testID="edit-navigation-map-screen">
        <AsyncContent state={map.state} onRetry={map.reload} loadingLabel="Carregando a navegação…">
          {(data) =>
            data ? (
              <>
                <NavigationTitleCard
                  key={data.id}
                  mapId={id}
                  initialTitle={data.name}
                  onSaved={map.reload}
                />

                <Section
                  title="Mapa"
                  description="Ajuste o que já existe no mapa ou acrescente o que falta."
                >
                  <View className="gap-3">
                    <Button
                      label="Adicionar ponto de interesse"
                      variant="outline"
                      onPress={() =>
                        router.push({
                          pathname: '/organizer/event/[eventId]/map/[mapId]/poi/new',
                          params: { eventId, mapId: id },
                        })
                      }
                      fullWidth
                      testID="add-poi"
                    />

                    <Button
                      label="Mapear novo caminho"
                      iconStart={<Icon name="map-marker-path" size={20} color={colors.white} />}
                      onPress={() =>
                        router.push({
                          pathname: '/organizer/event/[eventId]/map/[mapId]/record',
                          params: { eventId, mapId: id },
                        })
                      }
                      fullWidth
                      testID="record-path"
                    />

                    <Button
                      label="Ajustar rota"
                      variant="outline"
                      iconStart={<Icon name="vector-polyline" size={20} color={colors.content} />}
                      onPress={() =>
                        router.push({
                          pathname: '/organizer/event/[eventId]/map/[mapId]/adjust',
                          params: { eventId, mapId: id },
                        })
                      }
                      fullWidth
                      testID="adjust-route"
                    />
                  </View>
                </Section>
              </>
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
    </>
  );
}

type NavigationTitleCardProps = {
  mapId: string;
  initialTitle: string;
  onSaved: () => void;
};

/**
 * Título da navegação, salvo por botão explícito.
 *
 * Salvar ao digitar parecia mais direto, mas o título é do organizador: ele
 * decide quando está bom, o mesmo combinado do nome do caminho. O `maxLength`
 * evita descobrir o limite só pelo 400 da API (120, o `name_max_length` da API).
 */
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
        maxLength={120}
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
