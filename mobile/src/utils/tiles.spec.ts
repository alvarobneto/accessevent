import { describe, expect, it } from 'vitest';

import type { MapViewport, ViewportSize } from '@/utils/mapViewport';
import { isTileCacheFresh, TILE_CACHE_TTL_MS, tilesForViewport, zoomForLongitudeDelta } from '@/utils/tiles';

/** O enquadramento de um pavilhão, o mesmo ponto de partida do editor. */
function pavilionViewport(overrides: Partial<MapViewport> = {}): MapViewport {
  return {
    center: [-23.5505, -46.6333],
    latitudeDelta: 0.003,
    longitudeDelta: 0.003,
    ...overrides,
  };
}

const CANVAS: ViewportSize = { width: 350, height: 288 };

describe('zoomForLongitudeDelta', () => {
  it('casa a escala horizontal do canvas com a do Web Mercator', () => {
    // width/lngDelta = 350/0,003 ≈ 116.667 px/grau; 2^z = 360*116,667/256 ≈ 164
    expect(zoomForLongitudeDelta(0.003, 350)).toBe(17);
  });

  it('sobe o zoom quando o enquadramento encolhe', () => {
    expect(zoomForLongitudeDelta(0.001, 350)).toBeGreaterThan(zoomForLongitudeDelta(0.003, 350));
  });

  it('sobe o zoom quando a tela cresce', () => {
    expect(zoomForLongitudeDelta(0.003, 800)).toBeGreaterThan(zoomForLongitudeDelta(0.003, 350));
  });

  it('devolve o zoom mínimo para delta degenerado', () => {
    expect(zoomForLongitudeDelta(0, 350)).toBe(1);
    expect(zoomForLongitudeDelta(0.003, 0)).toBe(1);
  });
});

describe('tilesForViewport', () => {
  it('devolve lista vazia antes de medir o canvas', () => {
    expect(tilesForViewport(pavilionViewport(), { width: 0, height: 0 })).toEqual([]);
  });

  it('cobre o enquadramento com tiles vizinhos sem costura entre si', () => {
    const tiles = tilesForViewport(pavilionViewport(), CANVAS);
    expect(tiles.length).toBeGreaterThan(0);

    for (const tile of tiles) {
      expect(tile.rect.width).toBeGreaterThan(0);
      expect(tile.rect.height).toBeGreaterThan(0);
      // A borda de um tile é a borda do vizinho: o retângulo do próximo começa
      // exatamente onde o anterior termina na mesma linha (coluna + 1).
      const rightNeighbor = tiles.find((candidate) => candidate.y === tile.y && candidate.x === tile.x + 1);
      if (rightNeighbor) {
        expect(rightNeighbor.rect.x).toBeCloseTo(tile.rect.x + tile.rect.width, 0);
      }
    }
  });

  it('desenha os tiles com a URL do OpenStreetMap', () => {
    const tiles = tilesForViewport(pavilionViewport(), CANVAS);
    for (const tile of tiles) {
      expect(tile.href).toBe(`https://tile.openstreetmap.org/${tile.zoom}/${tile.x}/${tile.y}.png`);
    }
  });

  it('mantém colunas e linhas dentro da grade do nível de zoom', () => {
    const tiles = tilesForViewport(pavilionViewport(), CANVAS);
    const maxIndex = 2 ** tiles[0].zoom - 1;

    for (const tile of tiles) {
      expect(tile.x).toBeGreaterThanOrEqual(0);
      expect(tile.x).toBeLessThanOrEqual(maxIndex);
      expect(tile.y).toBeGreaterThanOrEqual(0);
      expect(tile.y).toBeLessThanOrEqual(maxIndex);
    }
  });

  it('encosta o centro perto do polo no limite do Web Mercator', () => {
    // Centro a 85,05°: a borda norte encosta no limite visível, mas a banda ainda
    // tem um tile de altura — o crítico é não estourar `n` nem pedir tile vazia.
    const tiles = tilesForViewport(pavilionViewport({ center: [85.05, -46.6333] }), CANVAS);
    expect(tiles.length).toBeGreaterThan(0);
    for (const tile of tiles) {
      expect(tile.y).toBeLessThanOrEqual(2 ** tile.zoom - 1);
    }
  });

  it('enquadramento no zoom mínimo pede poucos tiles, nunca a lista inteira', () => {
    const tiles = tilesForViewport(pavilionViewport({ latitudeDelta: 0.05, longitudeDelta: 0.1 }), CANVAS);
    expect(tiles.length).toBeLessThanOrEqual(9);
  });
});

describe('isTileCacheFresh', () => {
  const now = Date.UTC(2026, 9, 8);

  it('mantém um tile em cache por pelo menos sete dias', () => {
    expect(isTileCacheFresh(now - TILE_CACHE_TTL_MS, now)).toBe(true);
    expect(isTileCacheFresh(now - TILE_CACHE_TTL_MS + 1, now)).toBe(true);
  });

  it('expira tiles mais antigos e timestamps inválidos', () => {
    expect(isTileCacheFresh(now - TILE_CACHE_TTL_MS - 1, now)).toBe(false);
    expect(isTileCacheFresh(null, now)).toBe(false);
    expect(isTileCacheFresh(now + 1, now)).toBe(false);
  });
});
