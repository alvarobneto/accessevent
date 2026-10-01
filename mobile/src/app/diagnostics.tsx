import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import * as Location from 'expo-location';

import { Screen } from '@/components/screen';
import { Section } from '@/components/section';
import { Alert, Badge, Button, Card, Icon, Text } from '@/components/ui';
import { apiUrl, appEnv } from '@/config/env';
import { useHealthCheck } from '@/hooks/useHealthCheck';
import {
  getCurrentCoordinates,
  getLocationPermissionStatus,
  requestLocationPermission,
  type LocationProviderState,
} from '@/services/locationService';
import { colors } from '@/theme/tokens';
import type { Coordinates } from '@/types/coordinates';

const PERMISSION_LABELS: Record<Location.PermissionStatus | 'undetermined', string> = {
  granted: 'Concedida',
  denied: 'Negada',
  undetermined: 'Ainda não solicitada',
};

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Erro inesperado ao acessar a localização.';
}

function formatCoordinates(position: Coordinates | null): string {
  if (!position) {
    return 'Sem leitura';
  }
  const { latitude, longitude, accuracy } = position;
  const accuracyText = accuracy === null ? '' : ` (±${Math.round(accuracy)} m)`;
  return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}${accuracyText}`;
}

/**
 * Sprint 0: conexão com o backend e permissão de localização. Fica fora do fluxo
 * do aplicativo e é aberta por deep link em `/diagnostics`.
 */
export default function DiagnosticsScreen() {
  const { state, check } = useHealthCheck();
  const [location, setLocation] = useState<LocationProviderState | null>(null);
  const [position, setPosition] = useState<Coordinates | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    const read = async () => {
      try {
        setLocation(await getLocationPermissionStatus());
      } catch (error) {
        setLocationError(toErrorMessage(error));
      }
    };
    void read();
  }, []);

  const handleRequestPermission = useCallback(async () => {
    setRequesting(true);
    setLocationError(null);
    setPosition(null);

    try {
      const providerState = await requestLocationPermission();
      setLocation(providerState);

      if (providerState.permission !== Location.PermissionStatus.GRANTED) {
        return;
      }

      setPosition(await getCurrentCoordinates());
    } catch (error) {
      setLocationError(toErrorMessage(error));
    } finally {
      setRequesting(false);
    }
  }, []);

  return (
    <Screen scrollable testID="diagnostics-screen">
      <Section title="Ambiente" description="Verificação do desenvolvimento">
        <Card>
          <Text variant="caption">URL da API: {apiUrl}</Text>
          <Text variant="caption">Ambiente: {appEnv}</Text>
        </Card>
      </Section>

      <Section title="Conexão com o backend">
        {state.status === 'idle' || state.status === 'loading' ? (
          <Alert tone="info" title="Consultando o servidor…" />
        ) : null}

        {state.status === 'success' ? (
          <Alert
            tone="success"
            title="Servidor no ar"
            description={`${state.data.service} v${state.data.version} · ${state.data.environment} · banco ${
              state.data.database.status === 'up' ? 'conectado' : 'indisponível'
            }${state.data.database.latencyMs !== null ? ` (${state.data.database.latencyMs} ms)` : ''}`}
          />
        ) : null}

        {state.status === 'degraded' ? (
          <Alert
            tone="warning"
            title="Servidor no ar, com problemas"
            description="A aplicação responde, mas o banco de dados está indisponível."
          />
        ) : null}

        {state.status === 'error' ? (
          <Alert tone="error" title="Servidor indisponível" description={state.message} />
        ) : null}

        <Button label="Verificar novamente" variant="outline" onPress={() => void check()} />
      </Section>

      <Section title="Localização" description="expo-location">
        <Card>
          {location ? (
            <View className="gap-1">
              <Text variant="caption">Permissão: {PERMISSION_LABELS[location.permission]}</Text>
              <Text variant="caption">
                Serviços do dispositivo: {location.servicesEnabled ? 'ativos' : 'desativados'}
              </Text>
              <Text variant="caption">Precisão: {location.isPrecise ? 'alta' : 'reduzida'}</Text>
            </View>
          ) : (
            <Text variant="caption">Consultando permissão…</Text>
          )}

          <Text variant="caption">Posição atual: {formatCoordinates(position)}</Text>

          {locationError ? <Alert tone="error" description={locationError} /> : null}

          <Button
            label="Solicitar permissão de localização"
            onPress={() => void handleRequestPermission()}
            loading={requesting}
            loadingLabel="Solicitando…"
            iconStart={
              requesting ? undefined : (
                <Icon name="crosshairs-gps" size={20} color={colors.background} />
              )
            }
          />
        </Card>
      </Section>

      <Section title="Sobre esta tela">
        <Card variant="soft">
          <View className="gap-2">
            <View className="flex-row items-center gap-2">
              <Text variant="label">Validação da Sprint 0</Text>
              <Badge label="Fora do fluxo" />
            </View>
            <Text variant="caption">
              Projeto Expo com TypeScript, Expo Router, NativeWind, expo-location e integração com o
              backend NestJS. Acesse por deep link em /diagnostics.
            </Text>
          </View>
        </Card>
      </Section>
    </Screen>
  );
}
