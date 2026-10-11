import { describe, expect, it } from 'vitest';

import {
  CENTER_ANCHOR,
  anchorToPosition,
  isPoiAnchor,
  isPoiRect,
  normalizeRect,
  positionToAnchor,
  type PoiAnchor,
  type PoiRect,
} from './poi-anchor.js';

/**
 * Retângulo de 2 metros de lado em cima de São Paulo.
 *
 * A extensão é pequena de propósito, e é por isso que a comparação é com
 * tolerância: um grau vale ~111 km, então 2 m são 2e-5 graus, e a soma de dois
 * números da ordem de -23.55 perde precisão muito antes da última casa. Numa
 * tela, 1e-13 graus são microns — abaixo do que o dedo acerta.
 */
const rect: PoiRect = {
  northEast: [-23.55002, -46.63002],
  southWest: [-23.55004, -46.63004],
};

/** Tolerância de 1e-9 graus, que é ~0,1 mm no Equador. */
function expectCoordinate(actual: readonly number[], expected: readonly number[]): void {
  expect(actual[0]).toBeCloseTo(expected[0], 9);
  expect(actual[1]).toBeCloseTo(expected[1], 9);
}

function expectAnchor(actual: PoiAnchor, expected: PoiAnchor): void {
  expect(actual.u).toBeCloseTo(expected.u, 9);
  expect(actual.v).toBeCloseTo(expected.v, 9);
}

describe('anchorToPosition', () => {
  it('coloca a âncora do centro no meio do retângulo', () => {
    expectCoordinate(anchorToPosition(rect, CENTER_ANCHOR), [-23.55003, -46.63003]);
  });

  it('vai do canto oeste para o canto leste em u', () => {
    expect(anchorToPosition(rect, { u: 0, v: 0.5 })[1]).toBe(-46.63004);
    expect(anchorToPosition(rect, { u: 1, v: 0.5 })[1]).toBe(-46.63002);
  });

  it('vai do canto sul para o canto norte em v', () => {
    expect(anchorToPosition(rect, { u: 0.5, v: 0 })[0]).toBe(-23.55004);
    expect(anchorToPosition(rect, { u: 0.5, v: 1 })[0]).toBe(-23.55002);
  });

  it('leva o ícone junto quando o retângulo é redimensionado', () => {
    // O mesmo retângulo, agora com o dobro da altura. A âncora continua
    // descrevendo o mesmo lugar *dentro* dele, então o ponto absoluto muda — é
    // isso que faz o ícone acompanhar o retângulo em vez de ficar no mesmo
    // metro do mapa.
    const taller: PoiRect = {
      northEast: [-23.54998, -46.63002],
      southWest: [-23.55004, -46.63004],
    };

    const before = anchorToPosition(rect, CENTER_ANCHOR);
    const after = anchorToPosition(taller, CENTER_ANCHOR);

    expect(after[0]).not.toBeCloseTo(before[0], 9);
    // v = 0.25 é um quarto da altura nova, a partir do canto sul.
    expectCoordinate(anchorToPosition(taller, { u: 0.5, v: 0.25 }), [-23.550025, -46.63003]);
  });
});

describe('positionToAnchor', () => {
  it('é o inverso de anchorToPosition', () => {
    const anchor = { u: 0.25, v: 0.75 };

    expectAnchor(positionToAnchor(rect, anchorToPosition(rect, anchor)), anchor);
  });

  it('devolve o centro para o centro do retângulo', () => {
    expectAnchor(positionToAnchor(rect, [-23.55003, -46.63003]), CENTER_ANCHOR);
  });

  it('limita a âncora quando o ponto cai fora do retângulo', () => {
    // Ponto ao nordeste do retângulo: os dois eixos saturam em 1.
    const northEastOfRect: [number, number] = [-23.5, -46.63];
    expectAnchor(positionToAnchor(rect, northEastOfRect), { u: 1, v: 1 });

    // Ao sul e a oeste: saturam em 0.
    const southWestOfRect: [number, number] = [-23.6, -46.7];
    expectAnchor(positionToAnchor(rect, southWestOfRect), { u: 0, v: 0 });
  });

  it('caminha para o centro quando o retângulo não tem área', () => {
    const flat: PoiRect = {
      northEast: [-23.55002, -46.63002],
      southWest: [-23.55002, -46.63004],
    };

    expectAnchor(positionToAnchor(flat, [-23.55002, -46.63003]), CENTER_ANCHOR);
  });
});

describe('normalizeRect', () => {
  it('coloca o canto maior no northEast mesmo vindo invertido', () => {
    expect(
      normalizeRect({
        northEast: [-23.55004, -46.63004],
        southWest: [-23.55002, -46.63002],
      }),
    ).toEqual(rect);
  });

  it('não mexe num retângulo que já está na ordem', () => {
    expect(normalizeRect(rect)).toEqual(rect);
  });
});

describe('isPoiRect', () => {
  it('aceita dois cantos em coordenada', () => {
    expect(isPoiRect(rect)).toBe(true);
  });

  it('recusa canto que não é coordenada', () => {
    expect(isPoiRect({ northEast: [-23.55], southWest: rect.southWest })).toBe(false);
    expect(isPoiRect({ northEast: [0, 0, 0], southWest: rect.southWest })).toBe(false);
    expect(isPoiRect({ northEast: [Number.NaN, 0], southWest: rect.southWest })).toBe(false);
    expect(isPoiRect({ northEast: [91, 0], southWest: rect.southWest })).toBe(false);
  });

  it('recusa o que não é objeto', () => {
    expect(isPoiRect(null)).toBe(false);
    expect(isPoiRect('rect')).toBe(false);
    expect(isPoiRect(undefined)).toBe(false);
  });

  it('aceita os cantos invertidos, porque a ordem é do normalizeRect', () => {
    expect(
      isPoiRect({
        northEast: [-23.55004, -46.63004],
        southWest: [-23.55002, -46.63002],
      }),
    ).toBe(true);
  });
});

describe('isPoiAnchor', () => {
  it('aceita fração nos dois eixos', () => {
    expect(isPoiAnchor(CENTER_ANCHOR)).toBe(true);
    expect(isPoiAnchor({ u: 0, v: 1 })).toBe(true);
  });

  it('recusa fração fora de 0..1', () => {
    expect(isPoiAnchor({ u: 1.1, v: 0.5 })).toBe(false);
    expect(isPoiAnchor({ u: 0.5, v: -0.1 })).toBe(false);
  });

  it('recusa o que não tem os dois eixos', () => {
    expect(isPoiAnchor({ u: 0.5 })).toBe(false);
    expect(isPoiAnchor(null)).toBe(false);
    expect(isPoiAnchor({ u: '0.5', v: 0.5 })).toBe(false);
  });
});
