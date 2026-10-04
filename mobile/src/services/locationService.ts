import * as Location from 'expo-location';

import type { Coordinates, LocationSample } from '@/types/coordinates';

export type LocationProviderState = {
  servicesEnabled: boolean;
  permission: Location.PermissionStatus | 'undetermined';
  isPrecise: boolean;
};

/**
 * Intervalos pedidos ao GPS durante a gravação.
 *
 * `distanceInterval` é o que importa: o ponto só chega quando a pessoa andou um
 * metro, e é o sensor que decide descartar a leitura por ruído. `timeInterval`
 * limita a 1 s para o cronômetro e o status do sinal não ficarem atrasados, e não
 * para gerar ponto — o filtro de espaçamento de `utils/recording.ts` faz esse
 * trabalho.
 */
const WATCH_INTERVALS = {
  accuracy: Location.Accuracy.High,
  distanceInterval: 1,
  timeInterval: 1000,
} as const;

/** Converte um `LocationObject` do expo-location no formato interno do projeto. */
function toSample(location: Location.LocationObject): LocationSample {
  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    accuracy: location.coords.accuracy ?? null,
    recordedAt: location.timestamp,
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
  const { latitude, longitude, accuracy } = toSample(await getCurrentLocation());
  return { latitude, longitude, accuracy };
}

/** Obtém a posição atual com o instante da leitura, para semear o trajeto. */
export async function getCurrentSample(): Promise<LocationSample> {
  return toSample(await getCurrentLocation());
}

function getCurrentLocation(): Promise<Location.LocationObject> {
  return Location.getCurrentPositionAsync({ accuracy: WATCH_INTERVALS.accuracy });
}

/**
 * Assina atualizações de posição. Retorna a função para cancelar a assinatura.
 *
 * O callback de erro vem logo depois do de posição porque é a assinatura que
 * chama: `watchPositionAsync(qualidades, callback, onError)`.
 */
export async function watchPosition(
  onPosition: (sample: LocationSample) => void,
  onError?: (reason: string) => void,
): Promise<() => void> {
  const subscription = await Location.watchPositionAsync(
    WATCH_INTERVALS,
    (location) => onPosition(toSample(location)),
    onError,
  );

  return () => subscription.remove();
}
