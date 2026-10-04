/**
 * Um ponto gravado: `[latitude, longitude]` em graus decimais (WGS84).
 *
 * É o formato do `Path.geometry` do PRD §23, e é o mesmo que o app usa — o
 * `expo-location` entrega graus e o `react-native-maps` desenha graus, então a
 * tupla é a unidade do projeto inteiro e não um detalhe do banco.
 */
export type CoordinateTuple = [latitude: number, longitude: number];

/** Faixa de latitude: -90 no polo sul, 90 no polo norte. */
export const LATITUDE_RANGE = { min: -90, max: 90 } as const;

/** Faixa de longitude: -180 a leste, 180 a oeste. */
export const LONGITUDE_RANGE = { min: -180, max: 180 } as const;

/**
 * Se o valor é uma coordenada válida.
 *
 * Existe como função pura, separada do decorator, porque a regra é testável sem
 * subir o `ValidationPipe`: `NaN` passa em qualquer comparação, e um `NaN` na
 * geometria viraria `NaN` na distância e no `fitToCoordinates` do mapa — um
 * trajeto impossível desenhado em algum lugar do oceano.
 */
export function isCoordinateTuple(value: unknown): value is CoordinateTuple {
  if (!Array.isArray(value) || value.length !== 2) return false;

  const [latitude, longitude] = value as unknown[];

  if (typeof latitude !== 'number' || typeof longitude !== 'number')
    return false;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return false;

  return (
    latitude >= LATITUDE_RANGE.min &&
    latitude <= LATITUDE_RANGE.max &&
    longitude >= LONGITUDE_RANGE.min &&
    longitude <= LONGITUDE_RANGE.max
  );
}
