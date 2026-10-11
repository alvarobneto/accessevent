import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';

import { AsyncContent } from '@/components/async-content';
import { EventMap } from '@/components/map';
import { Screen } from '@/components/screen';
import { Alert, Button, EmptyState, Text } from '@/components/ui';
import { repository } from '@/data';
import type { Path, PointOfInterest } from '@/data/types';
import { useAsyncData } from '@/hooks/useAsyncData';
import { useMapGestureNavigation, type MapGestureTouchHandlers } from '@/hooks/useMapGestureNavigation';
import type { MapGeometry, MapPolyline } from '@/types/map';
import { toErrorMessage } from '@/utils/errors';
import { formatDistance } from '@/utils/format';
import { geometryLengthInMeters } from '@/utils/geo';
import { markersFromPois, polylinesFromPaths, rectsFromPois } from '@/utils/mapContent';
import { pathLabels } from '@/utils/pathLabel';

/**
 * Ajustar trajeto: o organizador corrige, no mapa, o caminho que o GPS gravou.
 *
 * É o destino de "Ajustar rota" (e do botão do editor do caminho): a gravação
 * anda pelo local e o sensor oscila, então o trajeto gravado nem sempre sai
 * redondo — aqui os pontos e os trechos viram alvos de arraste sobre o mapa
 * real, e o que mudou só vai para o banco quando a pessoa salva.
 *
 * A tela não rola: o mapa ocupa o resto da altura e o painel de distância, aviso
 * e ações fica embaixo, sempre visível — quem arrasta um ponto precisa ver o
 * botão de salvar sem rolar até ele.
 *
 * Os caminhos vizinhos e os pontos entram como contexto (mesma razão do formulário
 * de ponto): ajustar um trajeto sem ver o resto do pavilhão é ajustar no escuro.
 * O caminho em edição é a polilinha `highlight` e a única `editable` — é essa
 * dupla (`editable` + `onPreview`/`onCommit`) que liga a camada de arraste do
 * `EventMap`.
 *
 * **Nada aqui afirma que o trajeto é seguro.** O dado é o que o organizador
 * gravou, sem verificação automática (PRD §19/§30).
 */
export default function AdjustPathScreen() {
  const { mapId, pathId } = useLocalSearchParams<{ mapId: string; pathId: string }>();
  const id = pathId ?? '';
  const navigationId = mapId ?? '';

  /**
   * Caminho, caminhos e pontos num carregamento só.
   *
   * Seriam três `useAsyncData` com estados independentes: o mapa montaria quando
   * o primeiro chegasse e reenquadraria de novo a cada contexto que entrava,
   * tirando o zoom de quem já começou a ajustar. Carregando juntos, o `EventMap`
   * nasce uma vez, com tudo na mão.
   */
  const content = useAsyncData(async () => {
    const [path, paths, pois] = await Promise.all([
      repository.getPath(id),
      repository.listPaths(navigationId),
      repository.listPois(navigationId),
    ]);
    return { path, paths, pois };
  }, `${navigationId}:${id}`);
  const mapGestures = useMapGestureNavigation();

  return (
    <>
      <Stack.Screen options={{ ...mapGestures.screenOptions, title: 'Ajustar trajeto' }} />

      <Screen contentClassName="flex-1 gap-4 px-5 py-5" testID="adjust-path-screen">
        <AsyncContent
          state={content.state}
          onRetry={content.reload}
          loadingLabel="Carregando o trajeto…"
        >
          {({ path, paths, pois }) =>
            path ? (
              <AdjustPathEditor
                key={path.id}
                path={path}
                paths={paths}
                pois={pois}
                mapTouchHandlers={mapGestures.touchHandlers}
              />
            ) : (
              <AdjustPathNotFound />
            )
          }
        </AsyncContent>
      </Screen>
    </>
  );
}

/**
 * Caminho apagado enquanto a tela estava aberta.
 *
 * O `getPath` devolve `null` em 404; a tela existia porque o caminho estava lá
 * quando foi aberta, então a única saída que faz sentido é voltar ao mapa.
 */
function AdjustPathNotFound() {
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

type AdjustPathEditorProps = {
  path: Path;
  paths: readonly Path[];
  pois: readonly PointOfInterest[];
  mapTouchHandlers: MapGestureTouchHandlers;
};

function AdjustPathEditor({ path, paths, pois, mapTouchHandlers }: AdjustPathEditorProps) {
  /**
   * O trajeto salvo e o rascunho em edição, separados.
   *
   * `draft !== savedGeometry` é o "sujo": a comparação é por referência porque
   * todo gesto cria geometria nova, e a geometria salva volta a ser a mesma
   * referência depois do `PATCH` — sem contar passos nem comparar coordenada a
   * coordenada.
   */
  const [savedGeometry, setSavedGeometry] = useState<MapGeometry>(path.geometry);
  const [draft, setDraft] = useState<MapGeometry>(path.geometry);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const dirty = draft !== savedGeometry;

  /**
   * Pré-visualização e commit escrevem no mesmo estado.
   *
   * O arraste chama os dois (durante o movimento e na soltura); o leitor de tela
   * chama os dois de uma vez, porque não existe gesto de soltar para ele. No fim
   * das contas os dois sinais dizem "o trajeto é este agora" — a distinção vive
   * no `EventMap`, que só precisa saber quando congelar a projeção.
   */
  const applyDraft = useCallback((geometry: MapGeometry) => {
    setDraft(geometry);
    setError(null);
    setFeedback(null);
  }, []);

  const contextPolylines = useMemo(
    () => polylinesFromPaths(paths.filter((item) => item.id !== path.id)),
    [paths, path.id],
  );

  const polylines = useMemo<MapPolyline[]>(
    () => [
      ...contextPolylines,
      {
        id: path.id,
        geometry: draft,
        tone: 'highlight',
        editable: true,
        onPreview: applyDraft,
        onCommit: applyDraft,
      },
    ],
    [contextPolylines, path.id, draft, applyDraft],
  );

  const markers = useMemo(() => markersFromPois(pois), [pois]);
  const rects = useMemo(() => rectsFromPois(pois), [pois]);

  const labels = pathLabels(path);
  const draftDistance = geometryLengthInMeters(draft);

  /**
   * Salva o rascunho e fica na tela.
   *
   * Ficar é proposital: quem está corrigindo um trajeto torto costuma precisar de
   * mais de um ajuste, e voltar a cada salvamento transformaria o passo a passo
   * em ida e volta. A resposta da API devolve a geometria e a distância gravadas
   * — os dois números da tela passam a ser os do banco, não uma cópia local.
   */
  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setFeedback(null);

    try {
      const updated = await repository.replacePathGeometry(path.id, draft);
      setSavedGeometry(updated.geometry);
      setDraft(updated.geometry);
      setFeedback('Ajuste salvo.');
    } catch (saveError) {
      setError(toErrorMessage(saveError, 'Não foi possível salvar o ajuste do trajeto.'));
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    setDraft(savedGeometry);
    setError(null);
    setFeedback(null);
  };

  return (
    <>
      <View className="flex-1" {...mapTouchHandlers}>
        <EventMap
          className="flex-1 rounded-lg border border-border"
          polylines={polylines}
          markers={markers}
          rects={rects}
          accessibilityLabel={`Mapa com o trajeto ${labels.title} aberto para ajuste`}
          testID="adjust-path-map"
        />
      </View>

      <View className="gap-4">
        {feedback ? <Alert tone="success" title="Ajuste salvo" description={feedback} /> : null}
        {error ? <Alert tone="error" title="Não foi possível salvar" description={error} /> : null}

        <View className="gap-1">
          <Text variant="label">
            Distância de {formatDistance(draftDistance)}
            {dirty ? ' · alterações não salvas' : ''}
          </Text>
          <Text variant="caption">
            Arraste um ponto para reposicionar somente esse vértice. Os outros permanecem fixos.
            Arraste a linha ou o fundo para mover o mapa. Nada é salvo até você tocar em salvar.
          </Text>
        </View>

        <Button
          label="Salvar ajuste"
          loading={saving}
          loadingLabel="Salvando…"
          disabled={!dirty}
          onPress={() => void handleSave()}
          fullWidth
          testID="save-path-adjust"
        />

        {dirty ? (
          <Button
            label="Descartar alterações"
            variant="outline"
            disabled={saving}
            onPress={handleDiscard}
            fullWidth
            testID="discard-path-adjust"
          />
        ) : null}
      </View>
    </>
  );
}
