import type { Path } from '@/data/types';

import { polylinesFromPaths } from './mapContent';

function makePath(overrides: Partial<Path> = {}): Path {
  return {
    id: 'path-1',
    mapId: 'map-1',
    geometry: [
      [-23.5505, -46.6333],
      [-23.5506, -46.6334],
    ],
    distance: 111.2,
    createdAt: '2026-09-02T10:00:00.000Z',
    updatedAt: '2026-09-02T10:00:00.000Z',
    ...overrides,
  };
}

describe('polylinesFromPaths', () => {
  it('returns nothing for an empty list', () => {
    expect(polylinesFromPaths([])).toEqual([]);
  });

  it('keeps the id and the geometry of each path', () => {
    const result = polylinesFromPaths([makePath({ id: 'a' }), makePath({ id: 'b' })]);

    expect(result).toHaveLength(2);
    expect(result.map((polyline) => polyline.id)).toEqual(['a', 'b']);
    expect(result[0]?.geometry[0]).toEqual([-23.5505, -46.6333]);
  });

  it('leaves the tone on the default so no path is drawn as accessible', () => {
    const [polyline] = polylinesFromPaths([makePath()]);

    expect(polyline?.tone).toBeUndefined();
  });

  it('skips a path with a single point', () => {
    const single = makePath({
      geometry: [[-23.5505, -46.6333]],
    });

    expect(polylinesFromPaths([single])).toEqual([]);
  });

  it('skips a path whose points are out of the globe', () => {
    const broken = makePath({
      geometry: [
        [91, 0],
        [92, 0],
      ],
    });

    expect(polylinesFromPaths([broken])).toEqual([]);
  });

  it('keeps a path that has invalid points among valid ones', () => {
    const mixed = makePath({
      geometry: [
        [-23.5505, -46.6333],
        [Number.NaN, -46.6334],
        [-23.5506, -46.6334],
      ],
    });

    const result = polylinesFromPaths([mixed]);

    expect(result).toHaveLength(1);
    // A geometria passa inteira para o `EventMap`, que já filtra na borda do
    // desenho; o filtro aqui existe para não declarar um trajeto sem trecho.
    expect(result[0]?.geometry).toHaveLength(3);
  });
});
