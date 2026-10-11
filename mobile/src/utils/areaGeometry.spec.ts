import { describe, expect, it } from 'vitest';

import type { Coordinate } from '@/types/coordinates';

import {
  boundsOfRing,
  externalFreehandContour,
  moveRingVertex,
  pointInBounds,
  pointInRing,
  rectanglePixelCornersAt,
  rectanglePixelCornersFromDrag,
  rectFromRing,
  ringCenter,
  ringFromCorners,
  ringFromPoiRect,
  simplifyPoints,
  topmostAreaAt,
  translateRing,
  type AreaHitTarget,
  type AreaRing,
} from './areaGeometry';

/** Um retângulo de ~50 m no Memorial da América Latina, como o editor desenha. */
const rect: AreaRing = [
  [-23.5501, -46.6338],
  [-23.5501, -46.6328],
  [-23.5506, -46.6328],
  [-23.5506, -46.6338],
];

describe('ringFromCorners', () => {
  it('devolve os quatro cantos em sentido horário a partir do noroeste', () => {
    expect(ringFromCorners([-23.5501, -46.6328], [-23.5506, -46.6338])).toEqual(rect);
    expect(ringFromCorners([-23.5506, -46.6338], [-23.5501, -46.6328])).toEqual(rect);
  });
});

describe('rectangle pixel defaults', () => {
  it('creates a default square centered on a tap and keeps it inside the map', () => {
    expect(rectanglePixelCornersAt({ x: 2, y: 5 }, { width: 300, height: 220 })).toEqual([
      { x: 0, y: 0 },
      { x: 64, y: 64 },
    ]);
  });

  it('preserves the drag direction and adds the minimum side for a narrow gesture', () => {
    expect(rectanglePixelCornersFromDrag({ x: 40, y: 30 }, { x: 100, y: 32 }, { width: 300, height: 220 })).toEqual([
      { x: 40, y: 30 },
      { x: 100, y: 50 },
    ]);
  });
});

describe('ringFromPoiRect e rectFromRing', () => {
  it('o anel de um PoiRect é o mesmo rectCorners da Sprint 7', () => {
    const poiRect = rectFromRing(rect);

    expect(poiRect).not.toBeNull();
    expect(ringFromPoiRect(poiRect!)).toEqual(rect);
    expect(rectFromRing(ringFromPoiRect(poiRect!))).toEqual(poiRect);
  });

  it('a caixa de um anel retangular reconstrói os cantos opostos', () => {
    expect(rectFromRing(rect)).toEqual({
      northEast: [-23.5501, -46.6328],
      southWest: [-23.5506, -46.6338],
    });
  });

  it('sem geometria não há retângulo', () => {
    expect(rectFromRing([])).toBeNull();
  });
});

describe('pointInRing', () => {
  it('o centro está dentro e o canto de fora, fora', () => {
    expect(pointInRing([-23.55035, -46.6333], rect)).toBe(true);
    expect(pointInRing([-23.5507, -46.6333], rect)).toBe(false);
  });

  it('um anel com menos de três pontos não fecha superfície', () => {
    expect(pointInRing([0, 0], [[0, 0], [1, 1]])).toBe(false);
    expect(pointInRing([0, 0], [])).toBe(false);
  });

  it('acerta o buraco de uma área em formato de L', () => {
    const ell: AreaRing = [
      [0, 0],
      [0, 3],
      [1, 3],
      [1, 1],
      [3, 1],
      [3, 0],
    ];

    expect(pointInRing([0.5, 0.5], ell)).toBe(true);
    expect(pointInRing([0.5, 2], ell)).toBe(true);
    expect(pointInRing([2, 0.5], ell)).toBe(true);
    expect(pointInRing([2, 2], ell)).toBe(false);
  });
});

describe('translateRing e ringCenter', () => {
  it('transladar soma o delta nos dois eixos', () => {
    const moved = translateRing(rect, [0.001, 0.002]);

    expect(moved[0]).toEqual([rect[0]![0] + 0.001, rect[0]![1] + 0.002]);
  });

  it('o centro de um retângulo é o meio dos vértices', () => {
    const center = ringCenter(rect);

    expect(center[0]).toBeCloseTo(-23.55035, 9);
    expect(center[1]).toBeCloseTo(-46.6333, 9);
  });
});

describe('boundsOfRing e pointInBounds', () => {
  it('devolve a caixa exata do anel', () => {
    expect(boundsOfRing(rect)).toEqual({
      north: -23.5501,
      south: -23.5506,
      east: -46.6328,
      west: -46.6338,
    });
  });

  it('anel vazio não tem caixa', () => {
    expect(boundsOfRing([])).toBeNull();
  });

  it('a fronteira da caixa está dentro', () => {
    const bounds = boundsOfRing(rect) ?? { north: 0, south: 0, east: 0, west: 0 };

    expect(pointInBounds(rect[0]!, bounds)).toBe(true);
    expect(pointInBounds([-23.5509, -46.6328], bounds)).toBe(false);
  });
});

describe('moveRingVertex', () => {
  it('move só o vértice pedido', () => {
    const moved = moveRingVertex(rect, 1, [-23.5, -46.6]);

    expect(moved[1]).toEqual([-23.5, -46.6]);
    expect(moved[0]).toEqual(rect[0]);
    expect(moved[2]).toEqual(rect[2]);
    expect(moved[3]).toEqual(rect[3]);
    expect(moved).toHaveLength(rect.length);
  });

  it('índice negativo ou além do fim envolve no anel', () => {
    expect(moveRingVertex(rect, -1, rect[0]!)[rect.length - 1]).toEqual(rect[0]);
    expect(moveRingVertex(rect, rect.length, rect[0]!)[0]).toEqual(rect[0]);
  });
});

describe('simplifyPoints', () => {
  it('uma linha reta com pontos no meio vira dois pontos', () => {
    const points = [
      { x: 0, y: 0 },
      { x: 10, y: 1 },
      { x: 20, y: 0 },
      { x: 30, y: 0 },
    ];

    expect(simplifyPoints(points, 6)).toHaveLength(2);
  });

  it('um canto agudo de verdade não é alisado', () => {
    const points = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
    ];

    expect(simplifyPoints(points, 6)).toHaveLength(3);
  });
});

describe('externalFreehandContour', () => {
  it('removes the interior start and return stroke from a closed loop', () => {
    const circle = Array.from({ length: 9 }, (_value, index) => {
      const angle = (index / 8) * Math.PI * 2;
      return { x: 100 + Math.cos(angle) * 50, y: 100 + Math.sin(angle) * 50 };
    });
    const stroke = [
      { x: 100, y: 100 },
      { x: 120, y: 100 },
      { x: 140, y: 100 },
      ...circle,
      { x: 140, y: 100 },
      { x: 120, y: 100 },
      { x: 100, y: 100 },
    ];

    const contour = externalFreehandContour(stroke);

    expect(contour).toHaveLength(circle.length - 1);
    expect(contour.every((point) => Math.hypot(point.x - 100, point.y - 100) > 49)).toBe(true);
  });

  it('preserves an open freehand stroke and its endpoints', () => {
    const stroke = [{ x: 0, y: 0 }, { x: 15, y: 20 }, { x: 40, y: 10 }];

    expect(externalFreehandContour(stroke)).toEqual(stroke);
  });
});

describe('topmostAreaAt', () => {
  const first: AreaHitTarget = { id: 'baixo', geometry: rect };
  const second: AreaHitTarget = { id: 'cima', geometry: ringFromCorners([-23.5504, -46.6332], [-23.5502, -46.633]) };
  const inside = [-23.5503, -46.6331] as Coordinate;

  it('prefere a área desenhada por último (a que aparece em cima)', () => {
    expect(topmostAreaAt([first, second], inside)?.id).toBe('cima');
    expect(topmostAreaAt([second, first], inside)?.id).toBe('baixo');
  });

  it('fora de todas as áreas devolve null', () => {
    expect(topmostAreaAt([first, second], [-23.55, -46.63])).toBeNull();
    expect(topmostAreaAt([], inside)).toBeNull();
  });
});
