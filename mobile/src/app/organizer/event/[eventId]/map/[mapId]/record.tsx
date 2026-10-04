import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';

import { EventMap } from '@/components/map';
import { Screen } from '@/components/screen';
import { Alert, Button, Card, EmptyState, Icon, Text } from '@/components/ui';
import { repository } from '@/data';
import { usePathRecording } from '@/hooks/usePathRecording';
import { colors } from '@/theme/tokens';
import type { Coordinate } from '@/types/coordinates';
import type { MapPolyline } from '@/types/map';
import { toErrorMessage } from '@/utils/errors';
import { formatDistance, formatDuration } from '@/utils/format';
import { GPS_SIGNAL_LABELS } from '@/utils/recording';

/** Um trajeto com menos de dois pontos não tem trecho para desenhar. */
const MINIMUM_POINTS = 2;

/**
 * Mapear novo caminho: a gravação de GPS da Sprint 4.
 *
 * A tela é sua própria rota porque a gravação é uma tarefa, não um detalhe da tela
 * da navegação: tem entrada (iniciar), acompanhamento (tempo, distância e status
 * do GPS) e saída (finalizar e salvar, ou descartar). Abrir o mapa continua sendo
 * o gesto de ver o que já existe — o PRD §9.2 é quem descreve esta tela, do
 * "Iniciar gravação" ao "Caminho é adicionado ao mapa".
 *
 * A máquina de estado da gravação é `usePathRecording`; aqui só se desenha. O
 * trajeto fica em memória até `finalizar`, e só vira `Path` quando a pessoa
 * confirma: o botão de salvar é o que grava, e o erro da API aparece na tela em
 * vez de sumir com a gravação.
 */
export default function RecordPathScreen() {
  const { mapId } = useLocalSearchParams<{ eventId: string; mapId: string }>();
  const recording = usePathRecording();
  const { status, geometry, distanceMeters, elapsedMs, discardedCount, signal, accuracy } =
    recording;

  const [cameraCenter, setCameraCenter] = useState<Coordinate | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const polylines = useMemo<MapPolyline[]>(
    () => (geometry.length > 0 ? [{ id: 'recorded-path', geometry, tone: 'default' }] : []),
    [geometry],
  );

  /**
   * Posição de quem grava, no formato de coordenada gravada.
   *
   * Serve para duas coisas: dizer ao mapa de onde a câmera começa e servir de
   * alvo de acompanhamento até o mapa reportar o próprio centro. Sem esse
   * primeiro passo o laço de câmera só começaria depois de um gesto ou de um
   * `onRegionChangeComplete` que nem todas as plataformas disparam sozinhas.
   */
  const position = useMemo<Coordinate | null>(() => {
    const current = recording.currentPosition;
    return current ? [current.latitude, current.longitude] : null;
  }, [recording.currentPosition]);

  const isRecording = status === 'recording';
  const isFinished = status === 'finished';
  const hasTrail = geometry.length >= MINIMUM_POINTS;

  /**
   * Grava o trajeto e volta para o mapa, onde ele aparece desenhado.
   *
   * A distância não vai no corpo: a API calcula a partir da mesma geometria e
   * devolve o valor, então quem mostra o número na tela e quem grava não podem
   * discordar. O erro do `ApiError` aparece aqui — o trajeto continua em memória e
   * a pessoa pode tentar de novo sem percorrer o local outra vez.
   */
  const savePath = useCallback(async () => {
    setIsSaving(true);
    setSaveError(null);

    try {
      await repository.createPath({ mapId, geometry });
      router.back();
    } catch (error) {
      setSaveError(toErrorMessage(error, 'Não foi possível salvar o caminho. Tente novamente.'));
      setIsSaving(false);
    }
  }, [geometry, mapId]);

  return (
    <>
      <Stack.Screen options={{ title: 'Mapear novo caminho' }} />

      <Screen contentClassName="flex-1 gap-4 px-5 py-5" testID="record-path-screen">
        {position ? (
          <EventMap
            className="flex-1 rounded-lg border border-border"
            polylines={polylines}
            userLocation={recording.currentPosition}
            followUserLocation={isRecording}
            initialFocus={position}
            cameraToFollow={cameraCenter ?? position}
            onCameraSettled={setCameraCenter}
            accessibilityLabel="Mapa com o caminho em gravação"
          />
        ) : (
          <WaitingForGps />
        )}

        <View className="gap-4">
          {isRecording ? (
            <RecordingPanel
              elapsedMs={elapsedMs}
              distanceMeters={distanceMeters}
              pointCount={geometry.length}
              discardedCount={discardedCount}
              signalLabel={signal ? GPS_SIGNAL_LABELS[signal] : 'Sinal desconhecido'}
              accuracy={accuracy}
            />
          ) : null}

          {recording.isPrecise === false ? (
            <Alert
              tone="warning"
              title="Precisão reduzida"
              description="A localização do aparelho está autorizada em modo aproximado, então o trajeto pode sair com raio de quilômetros. Autorize a localização precisa nos ajustes do aparelho antes de gravar."
            />
          ) : null}

          {recording.issue ? (
            <Alert
              tone={recording.issue.tone}
              title={recording.issue.title}
              description={recording.issue.description}
            />
          ) : null}

          {status === 'idle' ? (
            <>
              <Card variant="soft">
                <View className="gap-1">
                  <Text variant="label">Como funciona</Text>
                  <Text variant="caption">
                    O app pede a permissão de localização, você percorre o caminho e o GPS registra
                    o trajeto no mapa. Mantenha o app aberto na frente enquanto grava.
                  </Text>
                </View>
              </Card>

              <Button
                label="Iniciar gravação"
                iconStart={<Icon name="record-circle-outline" size={20} color={colors.white} />}
                onPress={recording.start}
                fullWidth
              />
            </>
          ) : null}

          {status === 'starting' ? <Button label="Iniciando gravação…" loading fullWidth /> : null}

          {isRecording ? (
            <>
              <Button
                label="Finalizar gravação"
                iconStart={<Icon name="stop-circle-outline" size={20} color={colors.white} />}
                onPress={recording.finish}
                fullWidth
              />
              <Text variant="caption" centered>
                A gravação continua enquanto o app estiver aberto na frente. Não há pausa: quem
                percorre o local não precisa parar o trajeto.
              </Text>
            </>
          ) : null}

          {isFinished ? (
            <>
              {hasTrail ? (
                <Card variant="soft">
                  <View className="gap-3">
                    <View className="flex-row justify-between">
                      <Stat label="Tempo" value={formatDuration(elapsedMs)} />
                      <Stat label="Distância" value={formatDistance(distanceMeters)} />
                      <Stat label="Pontos" value={String(geometry.length)} />
                    </View>
                    <Text variant="caption" tint="muted">
                      Distância estimada pelo percurso, não em linha reta entre as pontas.
                    </Text>
                  </View>
                </Card>
              ) : (
                <Alert
                  tone="warning"
                  title="Trajeto muito curto"
                  description="A gravação tem um único ponto, e um ponto não forma caminho. Percorra o local de novo para registrar o trecho."
                />
              )}

              {saveError ? (
                <Alert tone="error" title="Não foi possível salvar" description={saveError} />
              ) : null}

              <Button
                label="Salvar no mapa"
                iconStart={<Icon name="content-save-outline" size={20} color={colors.white} />}
                onPress={() => void savePath()}
                loading={isSaving}
                disabled={!hasTrail || isSaving}
                fullWidth
              />

              <Button
                label="Descartar e gravar de novo"
                variant="danger"
                iconStart={<Icon name="trash-can-outline" size={20} color={colors.white} />}
                onPress={recording.discard}
                disabled={isSaving}
                fullWidth
              />

              <Button
                label="Voltar sem salvar"
                variant="ghost"
                onPress={() => router.back()}
                disabled={isSaving}
                fullWidth
              />
            </>
          ) : null}
        </View>
      </Screen>
    </>
  );
}

/**
 * O lugar do mapa antes do primeiro fix.
 *
 * Montar o `EventMap` sem nenhuma coordenada abriria no zoom do planeta — o
 * `initialRegion` só vale na montagem, e um mapa de pavilhão na visão do globo
 * não ajuda ninguém — então a espera é explícita: o mesmo retângulo, com o que
 * está faltando escrito dentro dele.
 */
function WaitingForGps() {
  return (
    <View className="flex-1 items-center justify-center rounded-lg border border-border bg-background p-4">
      <EmptyState
        compact
        icon="crosshairs-gps"
        title="Aguardando o GPS"
        description="A gravação começa a desenhar assim que o aparelho enviar a primeira posição."
      />
    </View>
  );
}

type RecordingPanelProps = {
  elapsedMs: number;
  distanceMeters: number;
  pointCount: number;
  discardedCount: number;
  signalLabel: string;
  accuracy: number | null;
};

/**
 * O que o PRD §9.2 exige visível durante a gravação: tempo, distância estimada e
 * status do GPS. A precisão crua entra ao lado do nome do sinal porque "médio" sem
 * número não diz o quanto.
 */
function RecordingPanel({
  elapsedMs,
  distanceMeters,
  pointCount,
  discardedCount,
  signalLabel,
  accuracy,
}: RecordingPanelProps) {
  return (
    <Card variant="soft">
      <View className="gap-3">
        <View className="flex-row justify-between">
          <Stat label="Tempo" value={formatDuration(elapsedMs)} />
          <Stat label="Distância" value={formatDistance(distanceMeters)} />
          <Stat label="Pontos" value={String(pointCount)} />
        </View>

        <View className="flex-row items-center justify-between gap-3 border-t border-border pt-3">
          <View className="flex-1 gap-1">
            <Text variant="caption" tint="muted">
              Sinal do GPS
            </Text>
            <Text variant="label">{signalLabel}</Text>
          </View>
          <View className="items-end gap-1">
            <Text variant="caption" tint="muted">
              Precisão
            </Text>
            <Text variant="label">{accuracy === null ? '—' : `±${Math.round(accuracy)} m`}</Text>
          </View>
        </View>

        {discardedCount > 0 ? (
          <Text variant="caption">
            {discardedCount} {discardedCount === 1 ? 'leitura descartada' : 'leituras descartadas'}{' '}
            por imprecisão ou salto do GPS.
          </Text>
        ) : null}
      </View>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View className="gap-1">
      <Text variant="caption" tint="muted">
        {label}
      </Text>
      <Text variant="label">{value}</Text>
    </View>
  );
}
