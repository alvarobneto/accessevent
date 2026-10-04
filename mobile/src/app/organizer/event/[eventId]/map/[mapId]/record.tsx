import { Stack, router } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { EventMap } from '@/components/map';
import { Screen } from '@/components/screen';
import { Alert, Button, Card, EmptyState, Icon, Text } from '@/components/ui';
import { usePathRecording } from '@/hooks/usePathRecording';
import { colors } from '@/theme/tokens';
import type { Coordinate } from '@/types/coordinates';
import type { MapPolyline } from '@/types/map';
import { formatDistance, formatDuration } from '@/utils/format';
import { GPS_SIGNAL_LABELS } from '@/utils/recording';

/** Um trajeto com menos de dois pontos não tem trecho para desenhar. */
const MINIMUM_POINTS = 2;

/**
 * Mapear novo caminho: a gravação de GPS da Sprint 4.
 *
 * A tela é sua própria rota porque a gravação é uma tarefa, não um detalhe da tela
 * da navegação: tem entrada (iniciar), acompanhamento (tempo, distância e status
 * do GPS) e saída (finalizar ou descartar). Abrir o mapa continua sendo o gesto de
 * ver o que já existe — o PRD §9.2 é quem descreve esta tela, do "Iniciar gravação"
 * ao "Caminho é adicionado ao mapa".
 *
 * A máquina de estado da gravação é `usePathRecording`; aqui só se desenha. O
 * trajeto fica em memória até a Sprint 5 gravar o `Path`, e a tela diz isso em vez
 * de fingir que salvou.
 */
export default function RecordPathScreen() {
  const recording = usePathRecording();
  const { status, geometry, distanceMeters, elapsedMs, discardedCount, signal, accuracy } =
    recording;

  const [cameraCenter, setCameraCenter] = useState<Coordinate | null>(null);

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
          {isRecording || isFinished ? (
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
              {geometry.length < MINIMUM_POINTS ? (
                <Alert
                  tone="warning"
                  title="Trajeto muito curto"
                  description="A gravação tem um único ponto, e um ponto não forma caminho. Percorra o local de novo para registrar o trecho."
                />
              ) : null}

              <Alert
                tone="info"
                title="Trajeto registrado nesta gravação"
                description="O caminho ainda não é enviado ao servidor: guardar o trajeto no mapa é a próxima etapa. Você pode descartá-lo e gravar de novo."
              />

              <Button
                label="Descartar e gravar de novo"
                variant="danger"
                iconStart={<Icon name="trash-can-outline" size={20} color={colors.white} />}
                onPress={recording.discard}
                fullWidth
              />

              <Button
                label="Voltar à navegação"
                variant="ghost"
                onPress={() => router.back()}
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
