import type { Coordinate } from '@/types/coordinates';
import type { MapGeometry } from '@/types/map';
import { isValidCoordinate } from '@/utils/geo';

/** Um metro em graus de latitude. */
const METERS_PER_DEGREE = 111_320;

/**
 * Passo do ajuste acessível de um ponto, em metros — o mesmo par de 2 m que
 * `MIN_POI_RECT_SPAN` usa na marcação.
 *
 * Um passo de 2 m é fisicamente exato e visualmente perceptível no zoom de
 * pavilhão: é o tamanho de um vão de corredor, então quem usa leitor de tela
 * consegue entender o que a ação fez. `increment` afasta o ponto da linha de
 * referência e `decrement` o aproxima.
 */
export const VERTEX_NUDGE_STEP_M = 2;

/**
 * Tolerância, em metros, para considerar um vértice sobre a linha de referência.
 *
 * A ação acessível de aproximar não move um ponto que já está na linha; a ação
 * de afastar escolhe um lado determinístico nesse caso.
 */
const ON_LINE_THRESHOLD_M = 0.1;

type Vec2 = { x: number; y: number };

/**
 * Vetor de `from` para `to`, em metros, numa projeção equiretangular local.
 *
 * Não é haversine: aqui o vetor precisa de **direção** e **componentes**, não de
 * comprimento — deslocar um ponto ao longo da perpendicular de um trecho é uma
 * conta vetorial. Para segmentos de pavilhão (dezenas de metros) a diferença
 * entre esta projeção e a métrica real é desprezível, e ela mantém `x`/`y`
 * ortogonais, que é o que a perpendicular precisa para ser perpendicular.
 */
function vectorInMeters(from: Coordinate, to: Coordinate): Vec2 {
  const meanLatitude = (from[0] + to[0]) / 2;
  const longitudeScale =
    Math.max(Math.cos((meanLatitude * Math.PI) / 180), 1e-6) * METERS_PER_DEGREE;

  return {
    x: (to[1] - from[1]) * longitudeScale,
    y: (to[0] - from[0]) * METERS_PER_DEGREE,
  };
}

/** O inverso: um deslocamento em metros a partir de uma origem vira coordenada. */
function offsetInMeters(origin: Coordinate, offset: Vec2): Coordinate {
  const longitudeScale = Math.max(Math.cos((origin[0] * Math.PI) / 180), 1e-6) * METERS_PER_DEGREE;

  return [origin[0] + offset.y / METERS_PER_DEGREE, origin[1] + offset.x / longitudeScale];
}

/** Índice dentro dos limites da geometria? */
function isValidIndex(geometry: MapGeometry, index: number): boolean {
  return Number.isInteger(index) && index >= 0 && index < geometry.length;
}

/**
 * Substitui um vértice do trajeto, mantendo todos os outros na mesma ordem.
 *
 * A substituição é absoluta — a coordenada nova entra no lugar da antiga — e não
 * um delta somado. É o mesmo contrato de `resizeRect`: partir da geometria
 * anterior e do ponto do dedo dá exatamente o mesmo resultado a cada `move`, e um
 * delta acumularia erro a cada quadro do gesto. Os testes fixam essa
 * substituição, porque uma mudança para delta seria silenciosa.
 *
 * Fora dos limites ou coordenada fora da faixa do globo devolve a geometria
 * intacta: não há vértice para mover, e gravar `[0, 0]` em silêncio é o defeito
 * que já apareceu no formulário de ponto (Sprint 7).
 */
export function moveVertex(
  geometry: MapGeometry,
  index: number,
  coordinate: Coordinate,
): MapGeometry {
  if (!isValidIndex(geometry, index) || !isValidCoordinate(coordinate)) return geometry;

  const next = geometry.slice();
  next[index] = coordinate;
  return next;
}

/**
 * Move a control vertex and redistribute the samples on its adjacent segments.
 *
 * The original geometry keeps its point count (required by the API). Samples
 * between the neighboring control vertices are interpolated along the updated
 * segments, so moving a corner can straighten a recorded curve instead of only
 * moving one GPS sample inside it.
 */
export function moveControlPoint(
  geometry: MapGeometry,
  controlIndices: readonly number[],
  index: number,
  coordinate: Coordinate,
): MapGeometry {
  const controlPosition = controlIndices.indexOf(index);
  if (controlPosition < 0 || !isValidIndex(geometry, index) || !isValidCoordinate(coordinate)) {
    return geometry;
  }

  const next = geometry.slice();
  next[index] = coordinate;
  const previousControlIndex = controlIndices[controlPosition - 1];
  const followingControlIndex = controlIndices[controlPosition + 1];

  if (previousControlIndex !== undefined) {
    interpolateSegment(next, previousControlIndex, index);
  }
  if (followingControlIndex !== undefined) {
    interpolateSegment(next, index, followingControlIndex);
  }

  return next;
}

/** Distributes interior samples evenly along the segment's endpoint coordinates. */
function interpolateSegment(geometry: Coordinate[], startIndex: number, endIndex: number): void {
  const start = geometry[startIndex];
  const end = geometry[endIndex];
  if (!start || !end) return;

  const span = endIndex - startIndex;
  for (let index = startIndex + 1; index < endIndex; index += 1) {
    const fraction = (index - startIndex) / span;
    geometry[index] = [
      start[0] + (end[0] - start[0]) * fraction,
      start[1] + (end[1] - start[1]) * fraction,
    ];
  }
}

/** Tolerância padrão para descartar ruído e manter as mudanças reais de direção. */
export const PATH_SIMPLIFICATION_TOLERANCE_M = 1;

/** Distância de um ponto ao segmento de reta entre duas coordenadas. */
function distanceToSegmentInMeters(point: Coordinate, start: Coordinate, end: Coordinate): number {
  const segment = vectorInMeters(start, end);
  const pointVector = vectorInMeters(start, point);
  const lengthSquared = segment.x * segment.x + segment.y * segment.y;

  if (lengthSquared === 0) return Math.hypot(pointVector.x, pointVector.y);

  const along = Math.max(
    0,
    Math.min(1, (pointVector.x * segment.x + pointVector.y * segment.y) / lengthSquared),
  );
  const projection = { x: segment.x * along, y: segment.y * along };

  return Math.hypot(pointVector.x - projection.x, pointVector.y - projection.y);
}

/** Distância mínima em metros entre uma coordenada e qualquer trecho da rota. */
export function distanceToPathInMeters(point: Coordinate, geometry: MapGeometry): number {
  if (geometry.length === 0) return Number.POSITIVE_INFINITY;
  if (geometry.length === 1) {
    const offset = vectorInMeters(geometry[0]!, point);
    return Math.hypot(offset.x, offset.y);
  }

  let minimumDistance = Number.POSITIVE_INFINITY;
  for (let index = 1; index < geometry.length; index += 1) {
    const start = geometry[index - 1];
    const end = geometry[index];
    if (!start || !end) continue;

    minimumDistance = Math.min(minimumDistance, distanceToSegmentInMeters(point, start, end));
  }

  return minimumDistance;
}

/**
 * Seleciona pontas e vértices de curvas relevantes sem alterar a geometria.
 *
 * Ramer-Douglas-Peucker roda em metros, independente do zoom: uma rota reta
 * recebe duas alças, um V três e um W cinco. Os índices apontam para a geometria
 * original, que permanece intacta e com a mesma contagem de pontos para a API.
 */
export function selectHandleIndices(
  geometry: MapGeometry,
  toleranceMeters = PATH_SIMPLIFICATION_TOLERANCE_M,
): number[] {
  if (geometry.length === 0) return [];
  if (geometry.length === 1) return [0];
  if (geometry.length === 2) return [0, 1];

  const retained = new Set([0, geometry.length - 1]);
  const segments: [number, number][] = [[0, geometry.length - 1]];

  while (segments.length > 0) {
    const [startIndex, endIndex] = segments.pop()!;
    const start = geometry[startIndex];
    const end = geometry[endIndex];
    if (!start || !end) continue;

    let farthestIndex = -1;
    let farthestDistance = toleranceMeters;

    for (let index = startIndex + 1; index < endIndex; index += 1) {
      const point = geometry[index];
      if (!point) continue;

      const distance = distanceToSegmentInMeters(point, start, end);
      if (distance > farthestDistance) {
        farthestIndex = index;
        farthestDistance = distance;
      }
    }

    if (farthestIndex >= 0) {
      retained.add(farthestIndex);
      segments.push([startIndex, farthestIndex], [farthestIndex, endIndex]);
    }
  }

  return [...retained].sort((left, right) => left - right);
}

export type PathHandleSelection = {
  pathId: string;
  vertexCount: number;
  indices: readonly number[];
};

/**
 * Mantém os índices das alças de um trajeto durante a sessão de edição.
 *
 * Os índices são escolhidos pelas mudanças de direção, mas continuam apontando
 * para a geometria original. Recalcular depois de mover um ponto faria a alça
 * sumir quando a rota fica reta; a seleção só nasce para outro caminho ou outra
 * quantidade de vértices.
 */
export function retainPathHandleSelection(
  current: PathHandleSelection | null,
  pathId: string,
  geometry: MapGeometry,
): PathHandleSelection {
  if (current?.pathId === pathId && current.vertexCount === geometry.length) return current;

  return {
    pathId,
    vertexCount: geometry.length,
    indices: selectHandleIndices(geometry),
  };
}

/**
 * Desloca um vértice perpendicularmente à **linha de referência** do trajeto.
 *
 * A linha é o que liga os dois vizinhos quando os dois existem — o chord — e o
 * único trecho vizinho nas pontas. Não é o traço desenhado, que é a polilinha
 * inteira: o que interessa é onde este ponto está em relação ao corredor que ele
 * deveria descrever, e a polilinha com o próprio ponto no meio não define lado.
 *
 * `direction` escolhe o lado do movimento, e é o par nativo do papel
 * `adjustable`:
 * - `'out'`: afasta o ponto da linha, no lado onde ele já está (ou à esquerda do
 *   trajeto, quando ele está exatamente sobre a linha — o único lado que dá para
 *   escolher sem informação);
 * - `'in'`: aproxima, sem atravessar: o passo é limitado pela distância até a
 *   linha, então quem está sobre ela não se move (não há o que aproximar).
 *
 * A conta é toda em metros e o resultado volta em graus, pela mesma projeção
 * equiretangular de `vectorInMeters`. Trabalhar em graus faria o passo vertical
 * (latitude) valer o dobro do horizontal (longitude) fora do equador.
 */
export function nudgeVertex(
  geometry: MapGeometry,
  index: number,
  direction: 'out' | 'in',
): MapGeometry {
  if (!isValidIndex(geometry, index)) return geometry;

  const point = geometry[index];
  const previous = index > 0 ? geometry[index - 1] : null;
  const following = index < geometry.length - 1 ? geometry[index + 1] : null;

  if (!previous && !following) return geometry;

  const lineStart = previous ?? point;
  const lineEnd = following ?? point;
  const chord = vectorInMeters(lineStart, lineEnd);
  const chordLength = Math.hypot(chord.x, chord.y);

  if (chordLength === 0) return geometry;

  // O ponto projetado na linha, e o vetor perpendicular da linha até o ponto.
  const pointVector = vectorInMeters(lineStart, point);
  const along = (pointVector.x * chord.x + pointVector.y * chord.y) / (chordLength * chordLength);
  const projection = { x: chord.x * along, y: chord.y * along };
  let perpendicular = { x: pointVector.x - projection.x, y: pointVector.y - projection.y };
  let offsetLength = Math.hypot(perpendicular.x, perpendicular.y);

  if (offsetLength < ON_LINE_THRESHOLD_M) {
    // Sobre a linha: `out` escolhe um lado — a esquerda do chord, `-dy/dx` — e
    // `in` não tem o que aproximar.
    if (direction === 'in') return geometry;

    perpendicular = { x: -chord.y / chordLength, y: chord.x / chordLength };
    offsetLength = 0;
  } else {
    perpendicular = { x: perpendicular.x / offsetLength, y: perpendicular.y / offsetLength };
  }

  if (direction === 'out') {
    return moveVertex(
      geometry,
      index,
      offsetInMeters(point, {
        x: perpendicular.x * VERTEX_NUDGE_STEP_M,
        y: perpendicular.y * VERTEX_NUDGE_STEP_M,
      }),
    );
  }

  const pull = Math.min(VERTEX_NUDGE_STEP_M, offsetLength);

  return moveVertex(
    geometry,
    index,
    offsetInMeters(point, { x: -perpendicular.x * pull, y: -perpendicular.y * pull }),
  );
}

/** Acessibilidade: move uma alça usando as outras alças como vizinhas de referência. */
export function nudgeControlPoint(
  geometry: MapGeometry,
  controlIndices: readonly number[],
  index: number,
  direction: 'out' | 'in',
): MapGeometry {
  const controlPosition = controlIndices.indexOf(index);
  if (controlPosition < 0) return geometry;

  const controlGeometry = controlIndices.map((controlIndex) => geometry[controlIndex]!);
  const nudgedControls = nudgeVertex(controlGeometry, controlPosition, direction);
  const coordinate = nudgedControls[controlPosition];

  return coordinate ? moveControlPoint(geometry, controlIndices, index, coordinate) : geometry;
}
