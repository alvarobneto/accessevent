import type { Area, Path, PointOfInterest } from '@/data/types';

import { markersFromPois, polygonsFromAreas, polylinesFromPaths, rectsFromPois } from './mapContent';

function makePath(overrides: Partial<Path> = {}): Path {
  return {
    id: 'path-1',
    mapId: 'map-1',
    geometry: [
      [-23.5505, -46.6333],
      [-23.5506, -46.6334],
    ],
    distance: 111.2,
    name: null,
    createdAt: '2026-09-02T10:00:00.000Z',
    updatedAt: '2026-09-02T10:00:00.000Z',
    ...overrides,
  };
}

function makePoi(overrides: Partial<PointOfInterest> = {}): PointOfInterest {
  return {
    id: 'poi-1',
    mapId: 'map-1',
    name: 'Entrada principal',
    type: 'Entrada',
    rect: {
      northEast: [-23.550498, -46.633298],
      southWest: [-23.550502, -46.633302],
    },
    anchor: { u: 0.5, v: 0.5 },
    position: [-23.5505, -46.6333],
    description: null,
    accessibilityInfo: null,
    createdAt: '2026-09-02T10:00:00.000Z',
    updatedAt: '2026-09-02T10:00:00.000Z',
    ...overrides,
  };
}

function makeArea(overrides: Partial<Area> = {}): Area {
  return {
    id: 'area-1',
    mapId: 'map-1',
    name: 'Praça de alimentação',
    type: 'alimentacao',
    geometry: [
      [-23.5505, -46.6333],
      [-23.5505, -46.6323],
      [-23.5515, -46.6323],
    ],
    description: null,
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

describe('markersFromPois', () => {
  it('returns nothing for an empty list', () => {
    expect(markersFromPois([])).toEqual([]);
  });

  it('keeps the id, the position and the name of each point', () => {
    const result = markersFromPois([makePoi({ id: 'a' }), makePoi({ id: 'b' })]);

    expect(result.map((marker) => marker.id)).toEqual(['a', 'b']);
    expect(result[0]?.coordinate).toEqual([-23.5505, -46.6333]);
    expect(result[0]?.label).toBe('Entrada principal');
  });

  it('carries the type as the callout line, whatever the description is', () => {
    const [marker] = markersFromPois([makePoi({ type: 'Elevador' })]);

    expect(marker?.description).toBe('Elevador');
  });

  it('does not show the description as the callout line', () => {
    // A descrição do ponto sai da UI da Sprint 7 (o formulário ficou só com nome
    // e tipo), e o balão do marcador é o lugar onde o tipo precisa estar dito —
    // não o lugar de uma frase que o organizador talvez nem tenha escrito.
    const [marker] = markersFromPois([makePoi({ description: 'Segundo andar' })]);

    expect(marker?.description).toBe('Entrada');
  });

  it('gives each marker the icon of its own type', () => {
    const [bathroom, elevator] = markersFromPois([
      makePoi({ id: 'a', type: 'Banheiro' }),
      makePoi({ id: 'b', type: 'Elevador' }),
    ]);

    expect(bathroom?.icon).toBe('bathroom');
    expect(elevator?.icon).toBe('elevator');
    expect(bathroom?.icon).not.toBe(elevator?.icon);
  });

  it('skips a point whose position is out of the globe', () => {
    expect(markersFromPois([makePoi({ position: [91, 0] })])).toEqual([]);
    expect(markersFromPois([makePoi({ position: [Number.NaN, -46.6333] })])).toEqual([]);
  });

  it('leaves the tone unset and the press unset, for the screen to decide', () => {
    const [marker] = markersFromPois([makePoi()]);

    expect(marker?.tone).toBeUndefined();
    expect(marker?.onPress).toBeUndefined();
  });
});

describe('rectsFromPois', () => {
  it('returns nothing for an empty list', () => {
    expect(rectsFromPois([])).toEqual([]);
  });

  it('keeps the id and the rect of each point', () => {
    const result = rectsFromPois([makePoi({ id: 'a' }), makePoi({ id: 'b' })]);

    expect(result.map((rect) => rect.id)).toEqual(['a', 'b']);
    expect(result[0]?.rect).toEqual({
      northEast: [-23.550498, -46.633298],
      southWest: [-23.550502, -46.633302],
    });
  });

  it('draws a saved point without the resize affordance, because editing is a screen', () => {
    const [rect] = rectsFromPois([makePoi()]);

    expect(rect?.editable).toBeUndefined();
    expect(rect?.onResize).toBeUndefined();
    expect(rect?.tone).toBeUndefined();
  });

  it('skips a point whose rect has a corner out of the globe', () => {
    const broken = makePoi({
      rect: { northEast: [91, -46.633298], southWest: [-23.550502, -46.633302] },
    });

    expect(rectsFromPois([broken])).toEqual([]);
  });

  it('skips a rect whose corners are swapped, because it would draw as negative area', () => {
    const inverted = makePoi({
      rect: { northEast: [-23.550502, -46.633302], southWest: [-23.550498, -46.633298] },
    });

    expect(rectsFromPois([inverted])).toEqual([]);
  });
});

describe('polygonsFromAreas', () => {
  it('preserves the area identity, descriptive fields, and polygon geometry', () => {
    expect(polygonsFromAreas([makeArea()])).toEqual([
      {
        id: 'area-1',
        name: 'Praça de alimentação',
        type: 'alimentacao',
        geometry: makeArea().geometry,
        description: undefined,
      },
    ]);
  });

  it('does not render incomplete or invalid polygon geometry', () => {
    expect(polygonsFromAreas([makeArea({ geometry: [[0, 0], [1, 1]] })])).toEqual([]);
    expect(
      polygonsFromAreas([makeArea({ geometry: [[0, 0], [1, 1], [91, 0]] })]),
    ).toEqual([]);
  });
});
