import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import * as Location from 'expo-location';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { apiUrl, appEnv } from '@/config/env';
import { useHealthCheck } from '@/hooks/useHealthCheck';
import {
  getCurrentCoordinates,
  getLocationPermissionStatus,
  requestLocationPermission,
  type LocationProviderState,
} from '@/services/locationService';
import { colors, spacing, typography } from '@/theme/theme';
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

export default function SetupScreen() {
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
      const next = await requestLocationPermission();
      setLocation(next);
      if (next.permission === 'granted') {
        setPosition(await getCurrentCoordinates());
      }
    } catch (error) {
      setLocationError(toErrorMessage(error));
    } finally {
      setRequesting(false);
    }
  }, []);

  return (
    <Screen
      title="AccessEvent"
      subtitle="Configuração inicial do projeto"
      scrollable
      testID="setup-screen"
    >
      <Card title="Conexão com o backend">
        <Text style={styles.muted}>URL da API: {apiUrl}</Text>
        <Text style={styles.muted}>Ambiente: {appEnv}</Text>

        {state.status === 'idle' || state.status === 'loading' ? (
          <Text style={styles.muted}>Consultando o servidor…</Text>
        ) : null}

        {state.status === 'success' ? (
          <View
            style={styles.row}
            accessible
            accessibilityLabel={`Servidor no ar, versão ${state.data.version}`}
          >
            <Text style={styles.success}>● Servidor no ar</Text>
            <Text style={styles.muted}>
              {state.data.service} v{state.data.version} · {state.data.environment}
            </Text>
            <Text style={styles.muted}>
              Banco de dados: {state.data.database.status === 'up' ? 'conectado' : 'indisponível'}
              {state.data.database.latencyMs !== null
                ? ` (${state.data.database.latencyMs} ms)`
                : ''}
            </Text>
          </View>
        ) : null}

        {state.status === 'degraded' ? (
          <View style={styles.row} accessibilityLiveRegion="polite">
            <Text style={styles.warning}>● Servidor no ar, com problemas</Text>
            <Text style={styles.muted}>
              {state.data.service} v{state.data.version} · {state.data.environment}
            </Text>
            <Text style={styles.muted}>Banco de dados: indisponível</Text>
          </View>
        ) : null}

        {state.status === 'error' ? (
          <View style={styles.row} accessibilityLiveRegion="polite">
            <Text style={styles.danger}>● Servidor indisponível</Text>
            <Text style={styles.muted}>{state.message}</Text>
          </View>
        ) : null}

        <Button label="Verificar novamente" onPress={() => void check()} variant="secondary" />
      </Card>

      <Card title="Localização (expo-location)">
        {location ? (
          <View style={styles.row}>
            <Text style={styles.label}>Permissão: {PERMISSION_LABELS[location.permission]}</Text>
            <Text style={styles.label}>
              Serviços do dispositivo: {location.servicesEnabled ? 'ativos' : 'desativados'}
            </Text>
            <Text style={styles.label}>Precisão: {location.isPrecise ? 'alta' : 'reduzida'}</Text>
          </View>
        ) : (
          <Text style={styles.muted}>Consultando permissão…</Text>
        )}

        <Text style={styles.muted}>Posição atual: {formatCoordinates(position)}</Text>

        {locationError ? (
          <Text style={styles.danger} accessibilityLiveRegion="polite">
            {locationError}
          </Text>
        ) : null}

        <Button
          label="Solicitar permissão de localização"
          onPress={() => void handleRequestPermission()}
          loading={requesting}
        />
      </Card>

      <Card title="Próximos passos">
        <Text style={styles.muted}>
          Esta tela valida a Sprint 0: projeto Expo com TypeScript, React Navigation, expo-location
          e integração com o backend NestJS.
        </Text>
        <Text style={styles.muted}>As telas de eventos, mapa e rotas entram na Sprint 1.</Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: spacing.xs,
  },
  label: {
    ...typography.body,
    color: colors.text,
  },
  muted: {
    ...typography.caption,
    color: colors.textMuted,
  },
  success: {
    ...typography.label,
    color: colors.success,
  },
  warning: {
    ...typography.label,
    color: colors.warning,
  },
  danger: {
    ...typography.caption,
    color: colors.danger,
  },
});
