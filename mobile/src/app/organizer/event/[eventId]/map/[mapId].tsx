import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';

import { AsyncContent } from '@/components/async-content';
import { EventMap } from '@/components/map';
import { NavigationMenu } from '@/components/navigation-menu';
import { Screen } from '@/components/screen';
import { Section } from '@/components/section';
import { Badge, Button, Card, EmptyState, Icon, Text } from '@/components/ui';
import { repository } from '@/data';
import { useAsyncData } from '@/hooks/useAsyncData';
import { useRefreshOnFocus } from '@/hooks/useRefreshOnFocus';
import { colors } from '@/theme/tokens';
import type { Coordinate, Coordinates } from '@/types/coordinates';
import type { MapGeometry, MapPolyline } from '@/types/map';
import { getCurrentCoordinates, requestLocationPermission, watchPosition } from '@/services/locationService';

/**
 * Gerenciar Navegação: o mapa e o que ainda vai existir nele.
 *
 * É o destino do item da lista de navegações do evento, e o editor fica a um
 * toque de distância pelo menu de três pontinhos — o mesmo combinado do evento: o
 * item da lista abre a coisa, o menu é quem edita. Pelo mesmo motivo os dados da
 * navegação (nome, datas) não aparecem aqui: eles têm tela própria, atrás de
 * "Ver detalhes".
 *
 * O mapa em si é o `EventMap`, desenhado na Sprint 3; os pontos, os caminhos e as
 * áreas chegam nas Sprints 5 a 8.
 */
export default function ManageNavigationMapScreen() {
  const { eventId, mapId } = useLocalSearchParams<{ eventId: string; mapId: string }>();
  const id = mapId ?? '';

  const map = useAsyncData(() => repository.getNavigationMap(id), id);

  useRefreshOnFocus(map.reload);

  const mapName = map.state.status === 'success' ? map.state.data?.name : null;

  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentPosition, setCurrentPosition] = useState<Coordinates | null>(null);
  const [pathGeometry, setPathGeometry] = useState<MapGeometry>([]);
  const [totalDistance, setTotalDistance] = useState(0);
  const [recordingStartedAt, setRecordingStartedAt] = useState<Date | null>(null);

  const stopWatching = useRef<(() => void) | null>(null);
  const lastPoint = useRef<Coordinate | null>(null);

  const distanceKm = totalDistance / 1000;
  const distanceText =
    totalDistance < 1000
      ? `${Math.round(totalDistance)} m`
      : `${distanceKm.toFixed(distanceKm >= 10 ? 1 : 2)} km`;

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const [elapsedMs, setElapsedMs] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isRecording && !isPaused && recordingStartedAt) {
      timerRef.current = setInterval(() => {
        setElapsedMs(Date.now() - recordingStartedAt.getTime());
      }, 500);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isRecording, isPaused, recordingStartedAt]);

  const haversineDistance = useCallback((a: Coordinate, b: Coordinate): number => {
    const [lat1, lon1] = a;
    const [lat2, lon2] = b;
    const R = 6371e3;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const lat1Rad = (lat1 * Math.PI) / 180;
    const lat2Rad = (lat2 * Math.PI) / 180;
    const h = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
    return R * c;
  }, []);

  const cleanupTracking = useCallback(async () => {
    if (stopWatching.current) {
      stopWatching.current();
      stopWatching.current = null;
    }
  }, []);

  const startRecording = useCallback(async () => {
    try {
      await requestLocationPermission();
      setPathGeometry([]);
      setTotalDistance(0);
      lastPoint.current = null;
      const startTime = new Date();
      setRecordingStartedAt(startTime);
      setElapsedMs(0);
      setIsPaused(false);
      setIsRecording(true);

      stopWatching.current = await watchPosition(
        (coords) => {
          setCurrentPosition(coords);
          const point: Coordinate = [coords.latitude, coords.longitude];

          if (coords.accuracy !== null && coords.accuracy > 50) {
            return;
          }

          if (!lastPoint.current) {
            lastPoint.current = point;
            setPathGeometry([point]);
            return;
          }

          if (lastPoint.current[0] === point[0] && lastPoint.current[1] === point[1]) {
            return;
          }

          const dist = haversineDistance(lastPoint.current, point);
          if (dist > 5) {
            lastPoint.current = point;
            setPathGeometry((prev) => [...prev, point]);
            setTotalDistance((prev) => prev + dist);
          } else if (dist > 0.5) {
            lastPoint.current = point;
            setPathGeometry((prev) => [...prev, point]);
            setTotalDistance((prev) => prev + dist);
          }
        },
        (error) => {
          console.warn('Location tracking error:', error);
        },
      );
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  }, [haversineDistance]);

  const pauseRecording = useCallback(() => {
    setIsPaused(true);
  }, []);

  const resumeRecording = useCallback(() => {
    setIsPaused(false);
  }, []);

  const stopRecording = useCallback(async () => {
    await cleanupTracking();
    setIsRecording(false);
    setIsPaused(false);
    setRecordingStartedAt(null);
    setElapsedMs(0);
  }, [cleanupTracking]);

  const resetRecording = useCallback(async () => {
    await cleanupTracking();
    setIsRecording(false);
    setIsPaused(false);
    setRecordingStartedAt(null);
    setElapsedMs(0);
    setPathGeometry([]);
    setTotalDistance(0);
    lastPoint.current = null;
  }, [cleanupTracking]);

  useEffect(() => {
    return () => {
      cleanupTracking();
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [cleanupTracking]);

  const currentPolyline: MapPolyline[] = pathGeometry.length > 0 ? [{ id: 'recording-path', geometry: pathGeometry, tone: 'highlight' as const }] : [];
  const hasPath = pathGeometry.length > 0;

  const navigationName = map.state.status === 'success' ? map.state.data?.name : null;

  return (
    <>
      <Stack.Screen
        options={{
          title: navigationName ?? 'Navegação',
          headerRight: () => (
            <NavigationMenu eventId={eventId} mapId={id} mapName={navigationName ?? undefined} />
          ),
        }}
      />

      <Screen scrollable testID="manage-navigation-map-screen">
        <AsyncContent state={map.state} onRetry={map.reload} loadingLabel="Carregando a navegação…">
          {(data) =>
            data ? (
              <>
                <View className="gap-2">
                  <EventMap
                    className="h-72 rounded-lg border border-border"
                    polylines={currentPolyline}
                    userLocation={currentPosition}
                    followUserLocation={isRecording && !isPaused}
                    accessibilityLabel="Mapa da navegação"
                  />
                  <Text variant="caption">
                    O mapa é desenhado a partir dos caminhos que você percorre no local.
                  </Text>
                </View>

                <Section
                  title="O que vem a seguir"
                  description="A navegação pode ser renomeada a qualquer momento pelo menu acima."
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
                      icon="map-marker-path"
                      title="Percorrer o local"
                      description="Acompanhar o caminho a pé e registrar o trajeto no mapa."
                    />
                  </Card>
                </Section>

                <Section title="Gravação GPS" description="Registre o trajeto percorrido para desenhar o mapa.">
                  <Card variant="soft">
                    <View className="gap-4">
                      {isRecording && (
                        <View className="flex-row justify-between rounded-lg bg-background px-4 py-3">
                          <View>
                            <Text variant="caption" className="text-muted-foreground">
                              Tempo
                            </Text>
                            <Text variant="label">{formatTime(elapsedMs)}</Text>
                          </View>
                          <View>
                            <Text variant="caption" className="text-muted-foreground">
                              Distância
                            </Text>
                            <Text variant="label">{distanceText}</Text>
                          </View>
                          <View>
                            <Text variant="caption" className="text-muted-foreground">
                              Pontos
                            </Text>
                            <Text variant="label">{pathGeometry.length}</Text>
                          </View>
                        </View>
                      )}

                      {!isRecording ? (
                        <Button
                          label="Iniciar gravação"
                          iconStart={<Icon name="record-circle-outline" size={20} color={colors.white} />}
                          onPress={startRecording}
                        />
                      ) : (
                        <View className="gap-2">
                          {isPaused ? (
                            <Button
                              label="Retomar gravação"
                              iconStart={<Icon name="play-circle-outline" size={20} color={colors.white} />}
                              onPress={resumeRecording}
                            />
                          ) : (
                            <Button
                              label="Pausar gravação"
                              variant="outline"
                              iconStart={<Icon name="pause-circle-outline" size={20} color={colors.gray900} />}
                              onPress={pauseRecording}
                            />
                          )}
                          <Button
                            label="Finalizar gravação"
                            variant="solid"
                            iconStart={<Icon name="stop-circle-outline" size={20} color={colors.white} />}
                            onPress={stopRecording}
                            disabled={!hasPath}
                          />
                          <Button
                            label="Descartar trajetória"
                            variant="ghost"
                            iconStart={<Icon name="trash-can-outline" size={20} color={colors.gray700} />}
                            onPress={resetRecording}
                          />
                        </View>
                      )}

                      <Text variant="caption">
                        {isRecording
                          ? 'Percorra o local com o GPS ativo. Pontos com baixa precisão são filtrados para manter o traçado mais limpo.'
                          : 'Solicitaremos permissão de localização ao iniciar a gravação.'}
                      </Text>
                    </View>
                  </Card>
                </Section>

                {eventId ? (
                  <Button
                    label="Voltar ao evento"
                    variant="ghost"
                    onPress={() => router.push(`/organizer/event/${eventId}`)}
                  />
                ) : null}
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
    </>
  );
}

type UpcomingItemProps = {
  icon: 'map-marker-multiple-outline' | 'vector-polyline' | 'map-marker-path';
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
