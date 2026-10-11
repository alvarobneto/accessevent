import type { Coordinate } from '@/types/coordinates';
import type { MapGeometry } from '@/types/map';
import type { ScreenPoint } from '@/utils/dropCoordinate';

import {
  moveVertex,
  nudgeVertex,
  retainPathHandleSelection,
  selectHandleIndices,
  VERTEX_NUDGE_STEP_M,
} from './pathGeometry';

/**
 * Os testes ficam perto do equador, onde um grau de latitude e um de longitude
 * quase não divergem: as contas do `nudge*` em metros podem ser conferidas de
 * cabeça (1° ≈ 111 320 m) sem a projeção do cosseno entrar na conta do teste.
 */
describe('moveVertex', () => {
  it('substitui só o vértice pedido', () => {
    const geometry: MapGeometry = [
      [0, 0],
      [0, 0.001],
      [0, 0.002],
    ];

    const next = moveVertex(geometry, 1, [0.001, 0.001]);

    expect(next).toEqual([
      [0, 0],
      [0.001, 0.001],
      [0, 0.002],
    ]);
    expect(geometry).toHaveLength(3);
  });

  it('ignora índice fora da geometria', () => {
    const geometry: MapGeometry = [
      [0, 0],
      [0, 0.001],
    ];

    expect(moveVertex(geometry, 2, [1, 1])).toBe(geometry);
    expect(moveVertex(geometry, -1, [1, 1])).toBe(geometry);
  });

  it('ignora coordenada fora da faixa do globo', () => {
    const geometry: MapGeometry = [
      [0, 0],
      [0, 0.001],
    ];

    expect(moveVertex(geometry, 0, [91, 0])).toBe(geometry);
    expect(moveVertex(geometry, 0, [0, 181])).toBe(geometry);
  });

  it('ao ajustar um vértice, mantém fixos os demais pontos e o número de pontos', () => {
    const geometry: MapGeometry = [
      [0, 0],
      [0, 0.001],
      [0, 0.002],
      [0, 0.003],
    ];
    const moved = moveVertex(geometry, 2, [0.001, 0.002]);

    expect(moved).toHaveLength(geometry.length);
    expect(moved[0]).toBe(geometry[0]);
    expect(moved[1]).toBe(geometry[1]);
    expect(moved[2]).toEqual([0.001, 0.002]);
    expect(moved[3]).toBe(geometry[3]);
  });

  it('reposiciona um vértice no meio de uma rota curva sem alterar quantidade, ordem ou vizinhos', () => {
    const geometry: MapGeometry = [
      [0, 0],
      [0.0004, 0.0003],
      [0.0008, 0.0004],
      [0.001, 0.0009],
      [0.0014, 0.0011],
    ];
    const replacement: Coordinate = [0.0007, 0.0008];

    const moved = moveVertex(geometry, 2, replacement);

    expect(moved).toHaveLength(geometry.length);
    expect(moved[0]).toBe(geometry[0]);
    expect(moved[1]).toBe(geometry[1]);
    expect(moved[2]).toBe(replacement);
    expect(moved[3]).toBe(geometry[3]);
    expect(moved[4]).toBe(geometry[4]);
    expect(geometry[2]).toEqual([0.0008, 0.0004]);
  });
});

describe('selectHandleIndices', () => {
  it('devolve vazio para geometria vazia', () => {
    expect(selectHandleIndices([], 44)).toEqual([]);
  });

  it('mantém sempre o primeiro e o último', () => {
    const points: ScreenPoint[] = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 3, y: 0 },
    ];

    const indices = selectHandleIndices(points, 44);

    expect(indices[0]).toBe(0);
    expect(indices[indices.length - 1]).toBe(3);
  });

  it('espaça as alças mantidas pelo menos minSpacing de distância', () => {
    const points: ScreenPoint[] = Array.from({ length: 100 }, (_value, index) => ({
      x: index,
      y: 0,
    }));

    // As alças caem em 0, 44, 88 e a última forçada em 99: o espaçamento é
    // medido entre alças mantidas, e a ponta entra mesmo perto da anterior.
    expect(selectHandleIndices(points, 44)).toEqual([0, 44, 88, 99]);
  });

  it('mantém um trajeto de dois pontos inteiro', () => {
    expect(
      selectHandleIndices(
        [
          { x: 0, y: 0 },
          { x: 10, y: 10 },
        ],
        44,
      ),
    ).toEqual([0, 1]);
  });
});

describe('retainPathHandleSelection', () => {
  it('preserva índices após mover vértices que mudam o espaçamento junto a uma curva', () => {
    const original: ScreenPoint[] = [
      { x: 0, y: 0 },
      { x: 50, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 50 },
      { x: 100, y: 100 },
    ];
    const moved: ScreenPoint[] = [
      { x: 0, y: 0 },
      { x: 50, y: 0 },
      { x: 95, y: 45 },
      { x: 100, y: 50 },
      { x: 100, y: 100 },
    ];
    const initialSelection = retainPathHandleSelection(null, 'path-1', original, 44);

    const afterMove = retainPathHandleSelection(initialSelection, 'path-1', moved, 44);

    expect(afterMove).toBe(initialSelection);
    expect(afterMove.indices).toEqual(initialSelection.indices);
  });

  it('calcula uma seleção nova para outro caminho ou outra quantidade de vértices', () => {
    const points: ScreenPoint[] = [
      { x: 0, y: 0 },
      { x: 50, y: 0 },
      { x: 100, y: 0 },
    ];
    const initial = retainPathHandleSelection(null, 'path-1', points, 44);

    expect(retainPathHandleSelection(initial, 'path-2', points, 44)).not.toBe(initial);
    expect(
      retainPathHandleSelection(initial, 'path-1', [...points, { x: 150, y: 0 }], 44),
    ).not.toBe(initial);
  });
});

describe('nudgeVertex', () => {
  /** Corredor leste-oeste: o chord é a longitude 0, e a perpendicular é latitude. */
  const corridor: MapGeometry = [
    [0, 0],
    [0, 0.001],
    [0, 0.002],
  ];

  it('move perpendicularmente ao chord, um passo de VERTEX_NUDGE_STEP_M', () => {
    const vertex: Coordinate = [0.0001, 0.001];
    const geometry: MapGeometry = [corridor[0], vertex, corridor[2]];

    const moved = nudgeVertex(geometry, 1, 'out')[1];

    expect(moved?.[1]).toBeCloseTo(0.001, 10);
    expect(Math.abs((moved?.[0] ?? 0) - vertex[0])).toBeCloseTo(VERTEX_NUDGE_STEP_M / 111_320, 6);
    expect(moved?.[0]).toBeGreaterThan(vertex[0]);
  });

  it('aproxima da linha sem atravessar', () => {
    const vertex: Coordinate = [0.0001, 0.001];
    const geometry: MapGeometry = [corridor[0], vertex, corridor[2]];

    const moved = nudgeVertex(geometry, 1, 'in')[1];

    expect(moved?.[0]).toBeLessThan(vertex[0]);
    expect(moved?.[0]).toBeGreaterThan(0);
    expect(moved?.[1]).toBeCloseTo(0.001, 10);
  });

  it('não move quem já está sobre a linha quando o pedido é aproximar', () => {
    const onLine: Coordinate = [0, 0.001];
    const geometry: MapGeometry = [corridor[0], onLine, corridor[2]];

    expect(nudgeVertex(geometry, 1, 'in')).toBe(geometry);
  });

  it('afasta quem está sobre a linha para um dos lados', () => {
    const onLine: Coordinate = [0, 0.001];
    const geometry: MapGeometry = [corridor[0], onLine, corridor[2]];

    const moved = nudgeVertex(geometry, 1, 'out')[1];

    expect(moved?.[1]).toBeCloseTo(0.001, 10);
    expect(Math.abs((moved?.[0] ?? 0) - onLine[0])).toBeCloseTo(VERTEX_NUDGE_STEP_M / 111_320, 6);
  });

  it('funciona na primeira ponta do trajeto', () => {
    const geometry: MapGeometry = [
      [0, 0],
      [0.001, 0.001],
    ];

    const moved = nudgeVertex(geometry, 0, 'out')[0];

    expect(moved).toBeDefined();
    const dx = ((moved?.[1] ?? 0) - 0) * 111_320;
    const dy = (moved?.[0] ?? 0) * 111_320;
    expect(Math.hypot(dx, dy)).toBeCloseTo(VERTEX_NUDGE_STEP_M, 4);
  });

  it('ignora geometria de um ponto só', () => {
    const geometry: MapGeometry = [[0, 0]];

    expect(nudgeVertex(geometry, 0, 'out')).toBe(geometry);
  });
});
