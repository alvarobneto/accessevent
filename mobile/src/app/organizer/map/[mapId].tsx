import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { AsyncContent } from '@/components/async-content';
import { Screen } from '@/components/screen';
import { Section } from '@/components/section';
import { Alert, Badge, Button, Card, EmptyState, Icon, Input, Text } from '@/components/ui';
import { repository } from '@/data';
import { useAsyncData } from '@/hooks/useAsyncData';
import { colors } from '@/theme/tokens';
import { toErrorMessage } from '@/utils/errors';

/**
 * Editor da navegação. O título já é editável; a estrutura do mapa (pontos de
 * interesse, conexões e desenho) entra nas próximas fases.
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
            <>
              <NavigationTitleCard
                key={data.id}
                mapId={id}
                initialTitle={data.name}
                onSaved={reload}
              />

              <Section
                title="O que vem a seguir"
                description="A navegação já existe e pode ser renomeada a qualquer momento."
              >
                <Card variant="soft">
                  <UpcomingItem
                    icon="map-marker-multiple-outline"
                    title="Pontos de interesse"
                    description="Entradas, banheiros, elevadores, escadas e balcões de informação."
                  />
                  <UpcomingItem
                    icon="vector-polyline"
                    title="Conexões"
                    description="Os caminhos que ligam os pontos, com largura, rampas e presença de escadas."
                  />
                  <UpcomingItem
                    icon="map-outline"
                    title="Mapa"
                    description="Desenho do espaço com a posição de cada ponto e das áreas."
                  />
                </Card>
              </Section>

              <Button label="Voltar ao evento" variant="ghost" onPress={() => router.back()} />
            </>
          ) : (
            <EmptyState
              icon="map-search-outline"
              title="Navegação não encontrada"
              description="Ela pode ter sido removida desde que esta tela foi aberta."
            />
          )
        }
      </AsyncContent>
    </Screen>
  );
}

type UpcomingItemProps = {
  icon: 'map-marker-multiple-outline' | 'vector-polyline' | 'map-outline';
  title: string;
  description: string;
};

function UpcomingItem({ icon, title, description }: UpcomingItemProps) {
  return (
    <View className="flex-row items-start gap-3">
      <View className="size-10 items-center justify-center rounded-md bg-background">
        <Icon name={icon} size={20} color={colors.gray500} />
      </View>
      <View className="flex-1 gap-1">
        <View className="flex-row items-center gap-2">
          <Text variant="label">{title}</Text>
          <Badge label="Em breve" />
        </View>
        <Text variant="caption">{description}</Text>
      </View>
    </View>
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
