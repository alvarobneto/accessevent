import * as Location from 'expo-location';

import type { Coordinates } from '@/types/coordinates';

export type LocationProviderState = {
  servicesEnabled: boolean;
  permission: Location.PermissionStatus | 'undetermined';
  isPrecise: boolean;
};

/** Converte um `LocationObject` do expo-location no formato interno do projeto. */
function toCoordinates(location: Location.LocationObject): Coordinates {
  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    accuracy: location.coords.accuracy ?? null,
  };
}

/** Verifica se os serviços de localização do dispositivo estão habilitados. */
export async function areLocationServicesEnabled(): Promise<boolean> {
  return Location.hasServicesEnabledAsync();
}

/** Lê a permissão de localização sem solicitar nada ao usuário. */
export async function getLocationPermissionStatus(): Promise<LocationProviderState> {
  const [servicesEnabled, foreground] = await Promise.all([
    areLocationServicesEnabled(),
    Location.getForegroundPermissionsAsync(),
  ]);

  return {
    servicesEnabled,
    permission: foreground.status,
    isPrecise: foreground.ios?.accuracy !== 'reduced',
  };
}

/** Solicita a permissão de localização em primeiro plano. */
export async function requestLocationPermission(): Promise<LocationProviderState> {
  await Location.requestForegroundPermissionsAsync();
  return getLocationPermissionStatus();
}

/** Obtém a posição atual do dispositivo. */
export async function getCurrentCoordinates(): Promise<Coordinates> {
  const location = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  });
  return toCoordinates(location);
}

/** Assina atualizações de posição. Retorna a função para cancelar a assinatura. */
export async function watchPosition(
  onPosition: (coordinates: Coordinates) => void,
  onError?: (reason: string) => void,
): Promise<() => void> {
  const subscription = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.High,
      distanceInterval: 1,
      timeInterval: 1000,
    },
    (location) => onPosition(toCoordinates(location)),
    onError,
  );

  return () => subscription.remove();
}
