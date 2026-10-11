import type { Coordinate } from '@/types/coordinates';
import type { MapGeometry } from '@/types/map';
import type { ScreenPoint } from '@/utils/dropCoordinate';
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
 * Os índices que viram alça de arraste, dada a posição em pixel de cada vértice.
 *
 * Um trajeto gravado tem dezenas ou centenas de pontos — um por segundo de
 * caminhada — e desenhar uma alça de 44 px em cada um deles produziria caixas
 * sobrepostas onde nada dá para acertar separado. A regra é simples e é a mesma
 * do trajeto: **sempre o primeiro e o último**, porque são as pontas do trajeto
 * e arrastá-las é como se estende ou se encurta um fim; entre eles, um
 * vértice por `minSpacing` de distância acumulada em pixel.
 *
 * O espaçamento é medido entre alças **mantidas**, não entre vértices
 * consecutivos: num trecho reto a decimação pula muitos pontos de uma vez, e
 * medir contra o vizinho imediato manteria alças juntas demais.
 */
export function selectHandleIndices(points: readonly ScreenPoint[], minSpacing: number): number[] {
  if (points.length === 0) return [];
  if (points.length === 1) return [0];

  const indices = [0];
  let last = points[0];

  for (let index = 1; index < points.length - 1; index += 1) {
    const point = points[index];
    if (Math.hypot(point.x - last.x, point.y - last.y) >= minSpacing) {
      indices.push(index);
      last = point;
    }
  }

  const lastIndex = points.length - 1;
  if (indices[indices.length - 1] !== lastIndex) indices.push(lastIndex);

  return indices;
}

export type PathHandleSelection = {
  pathId: string;
  vertexCount: number;
  indices: readonly number[];
};

/**
 * Mantém os índices das alças de um trajeto durante a sessão de edição.
 *
 * A decimação depende da distância visual entre vértices. Recalculá-la depois de
 * mover um ponto pode escolher outro índice numa curva e dar a impressão de que
 * surgiu um vértice novo. A seleção só nasce para outro caminho ou outra
 * quantidade de vértices; mudanças de coordenadas e de câmera preservam a
 * identidade por índice.
 */
export function retainPathHandleSelection(
  current: PathHandleSelection | null,
  pathId: string,
  points: readonly ScreenPoint[],
  minSpacing: number,
): PathHandleSelection {
  if (current?.pathId === pathId && current.vertexCount === points.length) return current;

  return {
    pathId,
    vertexCount: points.length,
    indices: selectHandleIndices(points, minSpacing),
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
