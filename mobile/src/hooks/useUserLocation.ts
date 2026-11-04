import { useCallback, useEffect, useState } from 'react';

import * as Location from 'expo-location';

import type { Coordinates } from '@/types/coordinates';
import {
  areLocationServicesEnabled,
  getCurrentSample,
  getLocationPermissionStatus,
  requestLocationPermission,
  watchPosition,
} from '@/services/locationService';

/** Estado do provedor de localização exposto para o hook de tela. */
export type LocationProviderState = {
  servicesEnabled: boolean;
  permission: Location.PermissionStatus | 'undetermined';
  isPrecise: boolean;
};

/**
 * Estado do hook de localização do usuário.
 *
 * `userLocation` é `null` antes da primeira leitura ou quando a permissão não foi
 * concedida: o `EventMap` não tenta desenhar um ponto em branco nesse estado,
 * e o app pode mostrar uma mensagem de "ativa sua localização".
 */
export type UserLocationState = {
  /** Posição atual do usuário, ou `null` sem permissão ou sem leitura. */
  userLocation: Coordinates | null;
  /** O mapa deve acompanhar a posição do usuário (tarjetar a câmera). */
  followUserLocation: boolean;
  /** Controla se o app está buscando a localização. */
  isLoading: boolean;
  /** Erro de localização, quando ocorre. */
  error: string | null;
  /** Provedor de localização (permite, negado, indeterminado, serviços desabilitados). */
  providerState: LocationProviderState;
  /** Solicita a permissão de localização em primeiro plano. */
  requestPermission: () => Promise<void>;
  /** Ativa ou desativa o acompanhamento da localização. */
  setFollowUserLocation: (follow: boolean) => void;
  /** Força uma nova leitura da localização. */
  refreshLocation: () => Promise<void>;
};

/**
 * Hook de localização para quem está ouvindo o mapa.
 *
 * Pela aceitação, o app só deve exigir a localização no momento em que o
 * organizador grava caminhos ou quando o usuário decisivamente pede a posição.
 * Para o mapa de consulta, o padrão é `followUserLocation = false`: somos
 * informados sobre o usuário, não o empurramos.
 */
export function useUserLocation() {
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [followUserLocation, setFollowUserLocationState] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [providerState, setProviderState] = useState<LocationProviderState>({
    servicesEnabled: false,
    permission: 'undetermined',
    isPrecise: false,
  });

  const startWatch = useCallback(async () => {
    let active = true;
    const stop = await watchPosition(
      (sample) => {
        if (!active) return;
        setUserLocation({ latitude: sample.latitude, longitude: sample.longitude, accuracy: sample.accuracy });
        setIsLoading(false);
        setError(null);
      },
      (reason) => {
        if (!active) return;
        setError(`Não foi possível acompanhar a localização: ${reason}`);
        setIsLoading(false);
      },
    );

    return () => {
      active = false;
      stop();
      setIsLoading(false);
    };
  }, []);

  const requestPermission = useCallback(async () => {
    setIsLoading(true);
    try {
      const permission = await requestLocationPermission();
      setProviderState(permission);

      if (permission.permission !== 'granted') {
        setError('Permissão de localização negada. Ative nas configurações do aparelho.');
        setIsLoading(false);
        return;
      }

      if (!permission.servicesEnabled) {
        setError('Serviços de localização desabilitados. Ative no aparelho.');
        setIsLoading(false);
        return;
      }

      setError(null);
      setFollowUserLocationState(true);
    } catch {
      setIsLoading(false);
      setError('Não foi possível solicitar a permissão de localização. Tente novamente.');
    }
  }, []);

  const refreshLocation = useCallback(async () => {
    const permission = await getLocationPermissionStatus();
    setProviderState(permission);

    if (permission.permission !== 'granted') {
      setError('Permissão de localização não concedida.');
      return;
    }

    let active = true;
    try {
      const sample = await getCurrentSample();
      if (active) {
        setUserLocation({
          latitude: sample.latitude,
          longitude: sample.longitude,
          accuracy: sample.accuracy,
        });
        setError(null);
      }
    } catch (cause) {
      if (active) setError('Não foi possível ler a localização. Tente novamente.');
    } finally {
      if (active) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    setUserLocation(null);
    setError(null);
  }, [followUserLocation]);

  useEffect(() => {
    let active = true;

    getLocationPermissionStatus()
      .then((permission) => {
        if (active) setProviderState(permission);
      })
      .catch(() => {
        if (active) setError('Não foi possível verificar a disponibilidade da localização.');
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!followUserLocation) {
      setUserLocation(null);
      setError(null);
      return;
    }

    let mounted = true;
    let cleanup: (() => void) | undefined;

    (async () => {
      try {
        const permission = await getLocationPermissionStatus();
        if (!mounted) return;
        setProviderState(permission);

        if (permission.permission !== 'granted') {
          setError('Permissão de localização não concedida.');
          return;
        }

        if (!permission.servicesEnabled) {
          setError('Serviços de localização desabilitados. Ative no aparelho.');
          return;
        }

        setIsLoading(true);
        const stop = await startWatch();
        if (!mounted) {
          stop();
          return;
        }
        cleanup = stop;
      } catch {
        if (!mounted) return;
        setIsLoading(false);
        setError('Não foi possível acompanhar a localização. Tente novamente.');
      }
    })();

    return () => {
      mounted = false;
      cleanup?.();
    };
  }, [followUserLocation, startWatch]);

  const userLocationState: UserLocationState = {
    userLocation,
    followUserLocation,
    isLoading,
    error,
    providerState,
    requestPermission,
    setFollowUserLocation: setFollowUserLocationState,
    refreshLocation,
  };

  return userLocationState;
}
