import type { LatLng, Region } from 'react-native-maps';

import type { Coordinate } from '@/types/coordinates';
import type { MapGeometry } from '@/types/map';

/**
 * Menor enquadramento com que o mapa sai: 0,002° é cerca de 220 m de latitude,
 * o suficiente para um ponto de interesse não virar o mapa inteiro.
 */
const MINIMUM_DELTA = 0.002;

/** Folga padrão ao enquadrar o conteúdo, em graus — cerca de 330 m. */
const GEOMETRY_PADDING = 0.003;

/** Enquadramento padrão de "você está aqui", em graus — cerca de 550 m. */
const FOLLOW_DELTA = 0.005;

/**
 * Coordenada dentro do globo, em graus decimais.
 *
 * A validação fica na borda do desenho: `geo` do dispositivo, resposta da API e
 * trajetória gravada chegam por caminhos diferentes, e um valor fora da faixa
 * jogaria o mapa para um ponto impossível em vez de ser ignorado.
 */
export function isValidCoordinate(coordinate: Coordinate | null | undefined): boolean {
  if (!coordinate) return false;

  const [latitude, longitude] = coordinate;

  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

/**
 * O par `[latitude, longitude]` vira o objeto que o `react-native-maps` consome.
 * É a única conversão do projeto entre o formato gravado e o formato desenhado.
 */
export function toLatLng(coordinate: Coordinate): LatLng {
  const [latitude, longitude] = coordinate;
  return { latitude, longitude };
}

/**
 * Região que enquadra a geometria inteira, com folga nas bordas.
 *
 * Devolve `null` quando não há nenhum ponto válido, e quem chama decide o que
 * fazer nesse caso — mostrar o mapa sem nada, pedir a localização do
 * participante ou avisar que o mapa ainda não foi desenhado. Um mapa de local
 * interno quase sempre tem um único ponto, então o menor enquadramento entra como
 * piso para o pino não preencher a tela inteira.
 */
export function regionForGeometry(geometry: MapGeometry): Region | null {
  let south: number | null = null;
  let north: number | null = null;
  let west: number | null = null;
  let east: number | null = null;

  for (const coordinate of geometry) {
    if (!isValidCoordinate(coordinate)) continue;

    const [latitude, longitude] = coordinate;
    south = south === null || latitude < south ? latitude : south;
    north = north === null || latitude > north ? latitude : north;
    west = west === null || longitude < west ? longitude : west;
    east = east === null || longitude > east ? longitude : east;
  }

  if (south === null || north === null || west === null || east === null) return null;

  return {
    latitude: (south + north) / 2,
    longitude: (west + east) / 2,
    latitudeDelta: Math.max(north - south + GEOMETRY_PADDING, MINIMUM_DELTA),
    longitudeDelta: Math.max(east - west + GEOMETRY_PADDING, MINIMUM_DELTA),
  };
}

/**
 * Região fixa ao redor de um ponto — a câmera que acompanha quem está percorrendo
 * o local, usada na gravação de caminho da Sprint 4.
 */
export function regionForCoordinate(coordinate: Coordinate, delta = FOLLOW_DELTA): Region {
  const [latitude, longitude] = coordinate;
  return {
    latitude,
    longitude,
    latitudeDelta: delta,
    longitudeDelta: delta,
  };
}
