import { isCoordinateTuple, type CoordinateTuple } from '../common/is-coordinate.js';

export const MINIMUM_AREA_POINTS = 3;
export const MAXIMUM_AREA_POINTS = 5000;

export type AreaGeometryProblem =
  | 'not-a-list'
  | 'too-few-points'
  | 'too-many-points'
  | 'invalid-coordinate'
  | 'degenerate';

const MESSAGES: Record<AreaGeometryProblem, string> = {
  'not-a-list': 'A geometria da área deve ser uma lista de pontos [latitude, longitude].',
  'too-few-points': `Uma área precisa de pelo menos ${MINIMUM_AREA_POINTS} vértices.`,
  'too-many-points': `A área tem vértices demais (máximo de ${MAXIMUM_AREA_POINTS}).`,
  'invalid-coordinate': 'Cada vértice da área deve ser um par [latitude, longitude].',
  degenerate: 'A geometria da área precisa delimitar uma região.',
};

export function checkAreaGeometry(value: unknown): AreaGeometryProblem | null {
  if (!Array.isArray(value)) return 'not-a-list';
  if (value.length < MINIMUM_AREA_POINTS) return 'too-few-points';
  if (value.length > MAXIMUM_AREA_POINTS) return 'too-many-points';
  if (!value.every(isCoordinateTuple)) return 'invalid-coordinate';

  const ring = value as CoordinateTuple[];
  const unique = new Set(ring.map(([latitude, longitude]) => `${latitude}:${longitude}`));
  if (unique.size < MINIMUM_AREA_POINTS || Math.abs(signedDoubleArea(ring)) < 1e-14) {
    return 'degenerate';
  }

  return null;
}

export function areaGeometryMessage(problem: AreaGeometryProblem): string {
  return MESSAGES[problem];
}

function signedDoubleArea(ring: readonly CoordinateTuple[]): number {
  let area = 0;
  for (let index = 0; index < ring.length; index += 1) {
    const current = ring[index];
    const next = ring[(index + 1) % ring.length];
    if (!current || !next) continue;
    area += current[1] * next[0] - next[1] * current[0];
  }
  return area;
}
