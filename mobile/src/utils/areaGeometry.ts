import type { Coordinate } from '@/types/coordinates';
import type { PoiRect } from '@/utils/poiAnchor';
import type { CoordinateBounds } from '@/utils/mapViewport';

/**
 * Geometria das áreas do editor de pontos.
 *
 * Uma área é um anel de coordenadas WGS84 — o mesmo idioma do `MapGeometry` do
 * resto do app. O anel é fechado por convenção (o último ponto liga de volta ao
 * primeiro ao desenhar), e os quatro pontos de um retângulo saem em sentido
 * horário a partir do noroeste, que é a ordem do `rectCorners` da Sprint 7 —
 * os dois formatos descrevem o mesmo retângulo e cada um vira o outro sem
 * tradução.
 */

/** O que o organizador desenhou: um cômodo de quatro cantos ou um polígono livre. */
export type AreaKind = 'rectangle' | 'freehand';

/** Anel fechado de coordenadas, em ordem. */
export type AreaRing = Coordinate[];

/** Ponto em pixel, usado nas ferramentas antes de converter para coordenadas. */
export type DrawingPoint = { x: number; y: number };

/**
 * O que o toque no canvas precisa saber de uma área para fazer o hit-test.
 *
 * O tipo é estrutural (`id` + `geometry`) e não `AreaDraft` de propósito: o
 * `poiEditor.ts` importa daqui para testar se o ponto caiu numa área, e se esta
 * função conhecesse o `AreaDraft`, os dois módulos ciclariam. Quem desenha
 * (`AreaDraft`) também satisfaz este tipo por ter exatamente esses dois campos.
 */
export type AreaHitTarget = {
  id: string;
  geometry: AreaRing;
};

/**
 * Piso de desenho de um retângulo, em pixels.
 *
 * Um arraste curto ainda produz uma forma tocável em vez de um traço achatado.
 * O toque simples usa o quadrado padrão de `DEFAULT_RECTANGLE_SIDE_PX`.
 */
export const MIN_RECTANGLE_SIDE_PX = 20;

/** Dimensão inicial de um cômodo criado com um toque simples no mapa. */
export const DEFAULT_RECTANGLE_SIDE_PX = 64;

/** Menor comprimento de um desenho livre, em pixels, para virar área. */
export const MIN_DRAWING_LENGTH_PX = 30;

/** Distância mínima entre dois pontos do desenho livre, em pixels. */
export const DRAW_POINT_SPACING_PX = 4;

/**
 * Tolerância do alisamento do desenho livre, em pixels.
 *
 * O dedo produz centenas de pontos por segundo; a maioria fica no mesmo traço. A
 * simplificação de Douglas–Peucker remove os que não mudam a forma, para o anel
 * gravado não carregar mil coordenadas. A tolerância é o quanto o traço pode
 * divergir do desenho original — 6px é meio dedo, invisível na forma.
 */
export const SIMPLIFY_TOLERANCE_PX = 6;

/** Um anel de área precisa de pelo menos três pontos para fechar uma superfície. */
export const MIN_AREA_RING_POINTS = 3;

/** Fechamento tolerado ao desenhar um contorno que termina no ponto inicial. */
const FREEHAND_CLOSE_TOLERANCE_PX = 24;

/**
 * Anel do retângulo entre dois pontos arrastados.
 *
 * Os cantos são normalizados (maior no canto superior esquerdo) e devolvidos em
 * sentido horário a partir do noroeste, na mesma ordem do `rectCorners` — então
 * `rectFromRing(ringFromCorners(a, b))` reconstrói o mesmo retângulo.
 */
export function ringFromCorners(first: Coordinate, second: Coordinate): AreaRing {
  const [aLatitude, aLongitude] = first;
  const [bLatitude, bLongitude] = second;

  const north = Math.max(aLatitude, bLatitude);
  const south = Math.min(aLatitude, bLatitude);
  const east = Math.max(aLongitude, bLongitude);
  const west = Math.min(aLongitude, bLongitude);

  return [
    [north, west],
    [north, east],
    [south, east],
    [south, west],
  ];
}

/** Cantos em pixel de um retângulo criado por toque, centralizado no ponto. */
export function rectanglePixelCornersAt(
  point: DrawingPoint,
  size: { width: number; height: number },
  side = DEFAULT_RECTANGLE_SIDE_PX,
): [DrawingPoint, DrawingPoint] | null {
  const dimension = Math.min(side, size.width, size.height);
  if (!Number.isFinite(dimension) || dimension < MIN_RECTANGLE_SIDE_PX) return null;

  const half = dimension / 2;
  const centerX = clamp(point.x, half, size.width - half);
  const centerY = clamp(point.y, half, size.height - half);

  return [
    { x: centerX - half, y: centerY - half },
    { x: centerX + half, y: centerY + half },
  ];
}

/**
 * Cantos do retângulo arrastado. Se o gesto for quase horizontal/vertical,
 * completa a dimensão curta até o mínimo sem mudar a identidade dos quatro cantos.
 */
export function rectanglePixelCornersFromDrag(
  start: DrawingPoint,
  end: DrawingPoint,
  size: { width: number; height: number },
): [DrawingPoint, DrawingPoint] | null {
  const width = Math.min(Math.max(Math.abs(end.x - start.x), MIN_RECTANGLE_SIDE_PX), size.width);
  const height = Math.min(Math.max(Math.abs(end.y - start.y), MIN_RECTANGLE_SIDE_PX), size.height);
  if (width < MIN_RECTANGLE_SIDE_PX || height < MIN_RECTANGLE_SIDE_PX) return null;

  const directionX = end.x < start.x ? -1 : 1;
  const directionY = end.y < start.y ? -1 : 1;
  const left = clamp(directionX > 0 ? start.x : start.x - width, 0, size.width - width);
  const top = clamp(directionY > 0 ? start.y : start.y - height, 0, size.height - height);

  return [{ x: left, y: top }, { x: left + width, y: top + height }];
}

/**
 * Remove o traço de entrada/saída quando uma pessoa começa no interior, contorna
 * uma forma fechada e termina de volta no ponto inicial. Os pontos preservados
 * continuam na ordem do contorno e passam a ser os únicos vértices editáveis.
 */
export function externalFreehandContour(
  points: readonly DrawingPoint[],
  closeTolerance = FREEHAND_CLOSE_TOLERANCE_PX,
): DrawingPoint[] {
  if (points.length < 4) return removeClosingDuplicate(points, closeTolerance);

  const first = points[0];
  const last = points[points.length - 1];
  if (!first || !last || distance(first, last) > closeTolerance) return [...points];

  const peakIndex = points.reduce((best, point, index) => {
    const bestPoint = points[best];
    return bestPoint && distance(first, point) > distance(first, bestPoint) ? index : best;
  }, 0);
  const peak = points[peakIndex];
  if (!peak || peakIndex < 1 || peakIndex >= points.length - 2) {
    return removeClosingDuplicate(points, closeTolerance);
  }

  const minimumContourRadius = distance(first, peak) * 0.5;
  let startIndex = -1;
  for (let index = 1; index <= peakIndex; index += 1) {
    const previous = points[index - 1];
    const point = points[index];
    const next = points[index + 1];
    if (
      previous &&
      point &&
      next &&
      distance(first, point) >= minimumContourRadius &&
      turnAngle(previous, point, next) >= 35
    ) {
      startIndex = index;
      break;
    }
  }

  let endIndex = -1;
  for (let index = points.length - 2; index >= peakIndex; index -= 1) {
    const previous = points[index - 1];
    const point = points[index];
    const next = points[index + 1];
    if (
      previous &&
      point &&
      next &&
      distance(first, point) >= minimumContourRadius &&
      turnAngle(previous, point, next) >= 35
    ) {
      endIndex = index;
      break;
    }
  }

  if (startIndex < 0 || endIndex - startIndex + 1 < MIN_AREA_RING_POINTS) {
    return removeClosingDuplicate(points, closeTolerance);
  }

  const contour = points.slice(startIndex, endIndex + 1);
  return pointInPixelRing(first, contour)
    ? removeClosingDuplicate(contour, closeTolerance)
    : removeClosingDuplicate(points, closeTolerance);
}

/** O anel retangular de um `PoiRect` — o mesmo `rectCorners` do POI da Sprint 7. */
export function ringFromPoiRect(rect: PoiRect): AreaRing {
  return ringFromCorners(rect.southWest, rect.northEast);
}

/**
 * Devolve o `PoiRect` pela caixa do anel.
 *
 * Serve para gravar uma área retangular no formato que o ponto de interesse já
 * usa (`rect` + `anchor`), quando a Sprint 9 fizer a persistência. Para um anel
 * livre a caixa é só um invólucro — quem decidir gravar polígono livre guarda o
 * anel inteiro.
 */
export function rectFromRing(ring: AreaRing): PoiRect | null {
  const bounds = boundsOfRing(ring);
  if (!bounds) return null;

  return {
    northEast: [bounds.north, bounds.east],
    southWest: [bounds.south, bounds.west],
  };
}

/**
 * O ponto está dentro do anel? (ray casting, par/ímpar).
 *
 * É o teste do toque: onde caiu no canvas, caiu dentro de alguma área? A escala
 * do editor é de pavilhão, e num anel de 20 m a curvatura da Terra não muda o
 * resultado — os meridianos são linhas retas na projeção do canvas, que é
 * linear, então o teste no domínio geográfico é o mesmo teste no domínio do
 * desenho.
 */
export function pointInRing(point: Coordinate, ring: AreaRing): boolean {
  if (ring.length < MIN_AREA_RING_POINTS) return false;

  const [latitude, longitude] = point;
  let inside = false;

  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index, index += 1) {
    const current = ring[index];
    const prior = ring[previous];
    if (!current || !prior) continue;

    const [currentLatitude, currentLongitude] = current;
    const [priorLatitude, priorLongitude] = prior;

    const crossesHorizontal = (currentLatitude > latitude) !== (priorLatitude > latitude);
    const intersection =
      longitude <
      ((priorLongitude - currentLongitude) * (latitude - currentLatitude)) / (priorLatitude - currentLatitude) +
        currentLongitude;

    if (crossesHorizontal && intersection) {
      inside = !inside;
    }
  }

  return inside;
}

/** Translação do anel inteiro — o que arrastar uma área faz. */
export function translateRing(ring: AreaRing, delta: Coordinate): AreaRing {
  const [deltaLatitude, deltaLongitude] = delta;

  return ring.map(([latitude, longitude]) => [latitude + deltaLatitude, longitude + deltaLongitude]);
}

/** Centro do anel: a média dos vértices. Para um retângulo é o meio exato. */
export function ringCenter(ring: AreaRing): Coordinate {
  let latitude = 0;
  let longitude = 0;

  for (const coordinate of ring) {
    latitude += coordinate[0];
    longitude += coordinate[1];
  }

  return [latitude / ring.length, longitude / ring.length];
}

/** A caixa do anel, ou `null` quando ele não tem ponto válido. O anel é só lido. */
export function boundsOfRing(ring: readonly Coordinate[]): CoordinateBounds | null {
  let north: number | null = null;
  let south: number | null = null;
  let east: number | null = null;
  let west: number | null = null;

  for (const [latitude, longitude] of ring) {
    north = north === null || latitude > north ? latitude : north;
    south = south === null || latitude < south ? latitude : south;
    east = east === null || longitude > east ? longitude : east;
    west = west === null || longitude < west ? longitude : west;
  }

  if (north === null || south === null || east === null || west === null) return null;

  return { north, south, east, west };
}

/** `point` está dentro da caixa (`south..north` e `west..east`)? */
export function pointInBounds(point: Coordinate, bounds: CoordinateBounds): boolean {
  const [latitude, longitude] = point;

  return (
    latitude >= bounds.south && latitude <= bounds.north && longitude >= bounds.west && longitude <= bounds.east
  );
}

/** Move o vértice `index` do anel para `position` — a alça de edição de vértice. */
export function moveRingVertex(ring: AreaRing, index: number, position: Coordinate): AreaRing {
  const next = [...ring];
  const safeIndex = ((index % next.length) + next.length) % next.length;
  next[safeIndex] = position;
  return next;
}

/**
 * Alisamento de Douglas–Peucker.
 *
 * Recebe qualquer sequência de pontos com `x`/`y` — o desenho livre guarda
 * pontos de tela em `MapCanvas`, então a simplificação acontece **em pixel,
 * antes de converter para graus**: a tolerância fica independente do zoom do
 * momento em que o gesto terminou. Devolve os pontos preservados, na ordem.
 */
export function simplifyPoints<T extends { x: number; y: number }>(points: readonly T[], tolerance: number): T[] {
  if (points.length <= 2) return [...points];

  let maxDistance = 0;
  let maxIndex = 0;

  const first = points[0];
  const last = points[points.length - 1];
  if (!first || !last) return [...points];

  for (let index = 1; index < points.length - 1; index += 1) {
    const point = points[index];
    if (!point) continue;

    const distance = distanceToSegment(point, first, last);
    if (distance > maxDistance) {
      maxDistance = distance;
      maxIndex = index;
    }
  }

  if (maxDistance > tolerance) {
    const left = simplifyPoints(points.slice(0, maxIndex + 1), tolerance);
    const right = simplifyPoints(points.slice(maxIndex), tolerance);

    return [...left.slice(0, -1), ...right];
  }

  return [first, last];
}

/**
 * A área de cima no ponto — a que um toque seleciona.
 *
 * O toque seleciona a área que **aparece por último** na lista, que é a
 * desenhada por cima das outras (a mesma regra da ordem de renderização do
 * SVG). Percorre em ordem reversa e devolve a primeira que contém o ponto, ou
 * `null` quando o ponto caiu fora de todas.
 */
export function topmostAreaAt<T extends AreaHitTarget>(areas: readonly T[], point: Coordinate): T | null {
  for (let index = areas.length - 1; index >= 0; index -= 1) {
    const area = areas[index];
    if (area && pointInRing(point, area.geometry)) return area;
  }

  return null;
}

function distanceToSegment(point: { x: number; y: number }, start: { x: number; y: number }, end: { x: number; y: number }): number {
  const segmentX = end.x - start.x;
  const segmentY = end.y - start.y;
  const lengthSquared = segmentX * segmentX + segmentY * segmentY;

  if (lengthSquared === 0) return Math.hypot(point.x - start.x, point.y - start.y);

  const projection = Math.min(
    Math.max(((point.x - start.x) * segmentX + (point.y - start.y) * segmentY) / lengthSquared, 0),
    1,
  );
  const closestX = start.x + projection * segmentX;
  const closestY = start.y + projection * segmentY;

  return Math.hypot(point.x - closestX, point.y - closestY);
}

function pointInPixelRing(point: DrawingPoint, ring: readonly DrawingPoint[]): boolean {
  if (ring.length < MIN_AREA_RING_POINTS) return false;

  let inside = false;
  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index, index += 1) {
    const current = ring[index];
    const prior = ring[previous];
    if (!current || !prior) continue;

    const crosses = (current.y > point.y) !== (prior.y > point.y);
    const intersection = ((prior.x - current.x) * (point.y - current.y)) / (prior.y - current.y) + current.x;
    if (crosses && point.x < intersection) inside = !inside;
  }

  return inside;
}

function distance(first: DrawingPoint, second: DrawingPoint): number {
  return Math.hypot(first.x - second.x, first.y - second.y);
}

function turnAngle(previous: DrawingPoint, current: DrawingPoint, next: DrawingPoint): number {
  const incoming = { x: current.x - previous.x, y: current.y - previous.y };
  const outgoing = { x: next.x - current.x, y: next.y - current.y };
  const product = Math.hypot(incoming.x, incoming.y) * Math.hypot(outgoing.x, outgoing.y);
  if (product === 0) return 0;

  const cosine = clamp((incoming.x * outgoing.x + incoming.y * outgoing.y) / product, -1, 1);
  return (Math.acos(cosine) * 180) / Math.PI;
}

function removeClosingDuplicate(points: readonly DrawingPoint[], tolerance: number): DrawingPoint[] {
  const first = points[0];
  const last = points[points.length - 1];
  if (points.length > MIN_AREA_RING_POINTS && first && last && distance(first, last) <= tolerance) {
    return points.slice(0, -1);
  }
  return [...points];
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
