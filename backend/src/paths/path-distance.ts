import type { CoordinateTuple } from '../common/is-coordinate.js';

/** Raio médio da Terra em metros, o mesmo valor do `src/utils/geo.ts` do app. */
const EARTH_RADIUS_M = 6371000;

/** Casas decimais guardadas na distância: centímetro é ruído de GPS. */
const DISTANCE_DECIMALS = 1;

/**
 * Comprimento do trajeto em metros, pela soma dos trechos (PRD §8.2).
 *
 * Soma de trecho e não o ponto mais distante do início porque o organizador
 * percorre um pavilhão, não desenha um raio: um corredor em `L` tem 40 m de
 * percurso e 29 m de deslocamento, e é o primeiro que a pessoa vai sentir.
 *
 * Haversine, e a mesma fórmula do app (`distanceInMeters`). As duas cópias têm
 * que concordar no centímetro, senão a distância mostrada durante a gravação muda
 * quando o caminho é salvo — o que faria o número parecer um erro do sensor.
 */
export function pathLengthInMeters(
  geometry: readonly CoordinateTuple[],
): number {
  let total = 0;

  for (let index = 1; index < geometry.length; index += 1) {
    const previous = geometry[index - 1];
    const current = geometry[index];

    if (previous && current) {
      total += haversineInMeters(previous, current);
    }
  }

  return roundToTenths(total);
}

/** Distância entre dois pontos da superfície, pela fórmula da haversine. */
function haversineInMeters(from: CoordinateTuple, to: CoordinateTuple): number {
  const [fromLatitude, fromLongitude] = from;
  const [toLatitude, toLongitude] = to;

  const latitudeDelta = toRadians(toLatitude - fromLatitude);
  const longitudeDelta = toRadians(toLongitude - fromLongitude);
  const fromLatitudeRadians = toRadians(fromLatitude);
  const toLatitudeRadians = toRadians(toLatitude);

  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(fromLatitudeRadians) *
      Math.cos(toLatitudeRadians) *
      Math.sin(longitudeDelta / 2) ** 2;

  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(a)));
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function roundToTenths(meters: number): number {
  const factor = 10 ** DISTANCE_DECIMALS;
  return Math.round(meters * factor) / factor;
}
