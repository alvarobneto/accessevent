import { describe, expect, it } from 'vitest';

import { coordinateAtDrop, isInsideMap, type DropFrame } from '@/utils/dropCoordinate';

/**
 * Mapa de 400x300 em (100, 200), mostrando a região de -23,5505 / -46,6332 com
 * 0,0010 de latitude e 0,0014 de longitude.Os números batem com um pavilhão:
 * 0,0010 de latitude ≈ 111 m de altura visível.
 */
const FRAME: DropFrame = {
  origin: { x: 100, y: 200 },
  size: { width: 400, height: 300 },
  region: {
    latitude: -23.5505,
    longitude: -46.6332,
    latitudeDelta: 0.001,
    longitudeDelta: 0.0014,
  },
};

describe('coordinateAtDrop', () => {
  it('devolve o centro da região quando o dedo cai no meio do mapa', () => {
    const coordinate = coordinateAtDrop({ x: 300, y: 350 }, FRAME);

    expect(coordinate).not.toBeNull();
    expect(coordinate?.[0]).toBeCloseTo(-23.5505, 7);
    expect(coordinate?.[1]).toBeCloseTo(-46.6332, 7);
  });

  it('desce no mapa quando a latitude sobe na tela', () => {
    // `y` cresce para baixo; o topo do mapa é o norte, então o topo tem latitude
    // maior. Um sinal invertido aqui colocaria o banheiro no fim do prédio.
    const top = coordinateAtDrop({ x: 300, y: 200 }, FRAME);
    const bottom = coordinateAtDrop({ x: 300, y: 500 }, FRAME);

    expect(top?.[0]).toBeGreaterThan(-23.5505);
    expect(bottom?.[0]).toBeLessThan(-23.5505);
  });

  it('distribui a latitude pela metade de cima, inteira, da região', () => {
    const top = coordinateAtDrop({ x: 300, y: 200 }, FRAME);

    expect(top?.[0]).toBeCloseTo(-23.55, 5);
  });

  it('distribui a longitude da esquerda para a direita', () => {
    const left = coordinateAtDrop({ x: 100, y: 350 }, FRAME);
    const right = coordinateAtDrop({ x: 500, y: 350 }, FRAME);

    expect(left?.[1]).toBeLessThan(-46.6332);
    expect(right?.[1]).toBeGreaterThan(-46.6332);
  });

  it('desconta a origem do mapa, senão soltar no canto da tela viraria fora do mapa', () => {
    // A mesma coordenada de tela sem `origin` seria lida como um ponto muito além
    // do noroeste do enquadramento. Aqui o mapa começa em (100, 200).
    const insideTopLeft = coordinateAtDrop({ x: 100, y: 200 }, FRAME);
    expect(insideTopLeft?.[0]).toBeCloseTo(-23.55, 5);
    expect(insideTopLeft?.[1]).toBeCloseTo(-46.6339, 5);
  });

  it('limita ao enquadramento quem solta fora do mapa', () => {
    const above = coordinateAtDrop({ x: 300, y: 0 }, FRAME);
    const below = coordinateAtDrop({ x: 300, y: 900 }, FRAME);

    expect(above?.[0]).toBeCloseTo(-23.55, 5);
    expect(below?.[0]).toBeCloseTo(-23.551, 5);
  });

  it('devolve null antes do mapa medir', () => {
    expect(coordinateAtDrop({ x: 300, y: 350 }, null)).toBeNull();
  });

  it('devolve null com tamanho zero, que é o primeiro layout', () => {
    expect(
      coordinateAtDrop({ x: 300, y: 350 }, { ...FRAME, size: { width: 0, height: 0 } }),
    ).toBeNull();
  });

  it('devolve null com região degenerada em vez de dividir por zero', () => {
    expect(
      coordinateAtDrop(
        { x: 300, y: 350 },
        {
          ...FRAME,
          region: { ...FRAME.region, latitudeDelta: 0, longitudeDelta: 0 },
        },
      ),
    ).toBeNull();
  });

  it('devolve null quando a conta sai da faixa do globo', () => {
    // É o modo de falha que a Sprint 7 já encontrou com `parseFloat(...) || 0`:
    // um ponto no Golfo da Guiné é uma coordenada válida e a API aceitaria.
    const broken = coordinateAtDrop(
      { x: 300, y: 350 },
      {
        ...FRAME,
        region: { ...FRAME.region, latitude: 999, latitudeDelta: 100, longitudeDelta: 100 },
      },
    );

    expect(broken).toBeNull();
  });

  it('mantém o ponto dentro da faixa mesmo com a região grande', () => {
    const coordinate = coordinateAtDrop(
      { x: 9999, y: -9999 },
      {
        ...FRAME,
        region: {
          latitude: -23.55,
          longitude: -46.63,
          latitudeDelta: 0.002,
          longitudeDelta: 0.002,
        },
      },
    );

    expect(coordinate?.[0]).toBeGreaterThanOrEqual(-90);
    expect(coordinate?.[0]).toBeLessThanOrEqual(90);
    expect(coordinate?.[1]).toBeGreaterThanOrEqual(-180);
    expect(coordinate?.[1]).toBeLessThanOrEqual(180);
  });
});

describe('isInsideMap', () => {
  it('aceita o ponto dentro do retângulo', () => {
    expect(isInsideMap({ x: 300, y: 350 }, FRAME)).toBe(true);
  });

  it('aceita as bordas, porque soltar exatamente na borda ainda é no mapa', () => {
    expect(isInsideMap({ x: 100, y: 200 }, FRAME)).toBe(true);
    expect(isInsideMap({ x: 500, y: 500 }, FRAME)).toBe(true);
  });

  it('recusa quem solta fora, para a tela poder avisar em vez de Placing no vazio', () => {
    expect(isInsideMap({ x: 90, y: 350 }, FRAME)).toBe(false);
    expect(isInsideMap({ x: 510, y: 350 }, FRAME)).toBe(false);
    expect(isInsideMap({ x: 300, y: 510 }, FRAME)).toBe(false);
  });

  it('recusa antes do mapa medir', () => {
    expect(isInsideMap({ x: 300, y: 350 }, null)).toBe(false);
  });
});
