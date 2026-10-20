import type { Coordinate } from '@/types/coordinates';
import type { MapGeometry } from '@/types/map';

import {
  distanceToPathInMeters,
  moveControlPoint,
  moveVertex,
  nudgeControlPoint,
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

describe('distanceToPathInMeters', () => {
  it('mede a distância mínima até o trecho mais próximo', () => {
    const route: MapGeometry = [
      [0, 0],
      [0, 0.002],
      [0.002, 0.002],
    ];

    expect(distanceToPathInMeters([0.00001, 0.001], route)).toBeCloseTo(1.1132, 3);
    expect(distanceToPathInMeters([0.001, 0.002], route)).toBeCloseTo(0, 6);
    expect(distanceToPathInMeters([0, 0], [])).toBe(Number.POSITIVE_INFINITY);
  });
});

describe('selectHandleIndices', () => {
  it('mantém só as pontas de uma rota reta com amostras intermediárias', () => {
    const straight: MapGeometry = Array.from({ length: 10 }, (_value, index) => [
      0,
      index * 0.0001,
    ]);

    expect(selectHandleIndices(straight)).toEqual([0, 9]);
  });

  it('mantém três alças num V e cinco num W sem alterar a geometria fonte', () => {
    const vShape: MapGeometry = [
      [0, 0],
      [0.0005, 0.0005],
      [0.001, 0.001],
      [0.0005, 0.0015],
      [0, 0.002],
    ];
    const wShape: MapGeometry = [
      [0, 0],
      [0.0005, 0.0005],
      [0.001, 0.001],
      [0.0005, 0.0015],
      [0, 0.002],
      [0.0005, 0.0025],
      [0.001, 0.003],
      [0.0005, 0.0035],
      [0, 0.004],
    ];

    expect(selectHandleIndices(vShape)).toEqual([0, 2, 4]);
    expect(selectHandleIndices(wShape)).toEqual([0, 2, 4, 6, 8]);
    expect(vShape).toHaveLength(5);
    expect(wShape).toHaveLength(9);
  });
});

describe('moveControlPoint', () => {
  it('move um vértice de controle e redistribui amostras sem mudar a contagem', () => {
    const geometry: MapGeometry = [
      [0, 0],
      [0.001, 0.001],
      [0.002, 0.002],
      [0.001, 0.003],
      [0, 0.004],
    ];
    const controls = [0, 2, 4];

    const moved = moveControlPoint(geometry, controls, 2, [0, 0.002]);

    expect(moved).toHaveLength(geometry.length);
    expect(moved).toEqual([
      [0, 0],
      [0, 0.001],
      [0, 0.002],
      [0, 0.003],
      [0, 0.004],
    ]);
  });

  it('permite transformar um W em reta mantendo todos os pontos da API', () => {
    const wShape: MapGeometry = [
      [0, 0],
      [0.0005, 0.0005],
      [0.001, 0.001],
      [0.0005, 0.0015],
      [0, 0.002],
      [0.0005, 0.0025],
      [0.001, 0.003],
      [0.0005, 0.0035],
      [0, 0.004],
    ];
    const controls = selectHandleIndices(wShape);
    const straightened = controls.slice(1, -1).reduce((geometry, index) => {
      const current = geometry[index]!;
      return moveControlPoint(geometry, controls, index, [0, current[1]]);
    }, wShape);

    expect(controls).toEqual([0, 2, 4, 6, 8]);
    expect(straightened).toHaveLength(wShape.length);
    expect(straightened.every(([latitude]) => latitude === 0)).toBe(true);
  });
});

describe('nudgeControlPoint', () => {
  it('ajusta acessivelmente uma alça e mantém a contagem do trajeto', () => {
    const geometry: MapGeometry = [
      [0, 0],
      [0, 0.0005],
      [0, 0.001],
      [0, 0.0015],
      [0, 0.002],
    ];

    const nudged = nudgeControlPoint(geometry, [0, 2, 4], 2, 'out');

    expect(nudged).toHaveLength(geometry.length);
    expect(nudged[2]?.[0]).toBeGreaterThan(geometry[2]![0]);
    expect(nudged[1]?.[0]).toBeGreaterThan(geometry[1]![0]);
  });
});

describe('retainPathHandleSelection', () => {
  it('preserva os índices durante o ajuste mesmo quando os pontos ficam alinhados', () => {
    const original: MapGeometry = [
      [0, 0],
      [0.001, 0.001],
      [0.002, 0.002],
      [0.001, 0.003],
      [0, 0.004],
    ];
    const moved: MapGeometry = original.map((point) => [0, point[1]]);
    const initialSelection = retainPathHandleSelection(null, 'path-1', original);

    const afterMove = retainPathHandleSelection(initialSelection, 'path-1', moved);

    expect(afterMove).toBe(initialSelection);
    expect(afterMove.indices).toEqual(initialSelection.indices);
  });

  it('calcula uma seleção nova para outro caminho ou outra quantidade de vértices', () => {
    const points: MapGeometry = [
      [0, 0],
      [0, 0.001],
      [0, 0.002],
    ];
    const initial = retainPathHandleSelection(null, 'path-1', points);

    expect(retainPathHandleSelection(initial, 'path-2', points)).not.toBe(initial);
    expect(retainPathHandleSelection(initial, 'path-1', [...points, [0, 0.003]])).not.toBe(initial);
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
