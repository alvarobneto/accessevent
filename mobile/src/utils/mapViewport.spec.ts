import { describe, expect, it } from 'vitest';

import type { ScreenPoint } from './dropCoordinate';
import {
  GRID_STEP_TARGET_PX,
  INITIAL_CENTER,
  INITIAL_LATITUDE_DELTA,
  MAX_LATITUDE_DELTA,
  MIN_LATITUDE_DELTA,
  ZOOM_FACTOR,
  gridStepFor,
  mapToScreen,
  normalizeViewport,
  panViewport,
  pointInBounds,
  resizeViewport,
  screenToMap,
  viewportForBounds,
  zoomViewportAt,
  type MapViewport,
} from './mapViewport';

/** Canvas de demonstração: o mesmo retrato de um celular, onde a conta roda. */
const size = { width: 390, height: 400 };

const viewport: MapViewport = {
  center: INITIAL_CENTER,
  latitudeDelta: INITIAL_LATITUDE_DELTA,
  longitudeDelta: INITIAL_LATITUDE_DELTA * (size.width / size.height),
};

describe('normalizeViewport', () => {
  it('usa como zoom inicial o máximo menos dois passos de zoom out', () => {
    expect(INITIAL_LATITUDE_DELTA).toBeCloseTo(MIN_LATITUDE_DELTA * ZOOM_FACTOR ** 2, 12);
  });

  it('devolve a longitude na proporção da tela', () => {
    const normalized = normalizeViewport(
      { center: INITIAL_CENTER, latitudeDelta: 0.001, longitudeDelta: 99 },
      size,
    );

    expect(normalized.longitudeDelta).toBeCloseTo(0.001 * (size.width / size.height), 12);
  });

  it('limita o zoom no piso e no teto', () => {
    expect(
      normalizeViewport(
        { center: INITIAL_CENTER, latitudeDelta: 0.0000001, longitudeDelta: 0 },
        size,
      ).latitudeDelta,
    ).toBe(MIN_LATITUDE_DELTA);
    expect(
      normalizeViewport({ center: INITIAL_CENTER, latitudeDelta: 5, longitudeDelta: 5 }, size)
        .latitudeDelta,
    ).toBe(MAX_LATITUDE_DELTA);
  });
});

describe('resizeViewport', () => {
  it('preserva escala e centro quando o layout do canvas muda', () => {
    const previousSize = { width: 390, height: 400 };
    const nextSize = { width: 390, height: 480 };
    const previousViewport = normalizeViewport(viewport, previousSize);
    const resized = resizeViewport(previousViewport, previousSize, nextSize);

    expect(resized.center).toEqual(previousViewport.center);
    expect(resized.latitudeDelta / nextSize.height).toBeCloseTo(
      previousViewport.latitudeDelta / previousSize.height,
      12,
    );
    expect(resized.longitudeDelta / nextSize.width).toBeCloseTo(
      previousViewport.longitudeDelta / previousSize.width,
      12,
    );
  });

  it('normaliza o primeiro layout quando o canvas ainda não tinha tamanho', () => {
    const resized = resizeViewport(viewport, { width: 0, height: 0 }, size);

    expect(resized).toEqual(normalizeViewport(viewport, size));
  });
});

describe('mapToScreen e screenToMap', () => {
  it('o centro do mapa cai no centro do canvas', () => {
    const point = mapToScreen(INITIAL_CENTER, viewport, size);

    expect(point.x).toBeCloseTo(size.width / 2, 9);
    expect(point.y).toBeCloseTo(size.height / 2, 9);
  });

  it('ir para o leste coloca o ponto para a direita, e para o norte para cima', () => {
    const [latitude, longitude] = INITIAL_CENTER;
    const east = mapToScreen([latitude, longitude + 0.0003], viewport, size);
    const north = mapToScreen([latitude + 0.0003, longitude], viewport, size);

    expect(east.x).toBeGreaterThan(size.width / 2);
    expect(north.y).toBeLessThan(size.height / 2);
  });

  it('uma coordenada convertida volta a ser a mesma (ida e volta)', () => {
    const sample: ScreenPoint = { x: 123, y: 87 };
    const coordinate = screenToMap(sample, viewport, size);
    const back = coordinate ? mapToScreen(coordinate, viewport, size) : null;

    expect(back).not.toBeNull();
    expect(back?.x).toBeCloseTo(sample.x, 6);
    expect(back?.y).toBeCloseTo(sample.y, 6);
  });

  it('o ponto fora do canvas é limitado à borda, e não projetado para fora', () => {
    const coordinate = screenToMap({ x: 9999, y: 9999 }, viewport, size);

    expect(coordinate).not.toBeNull();
    const back = mapToScreen(coordinate ?? INITIAL_CENTER, viewport, size);
    expect(back.x).toBeCloseTo(size.width, 6);
    expect(back.y).toBeCloseTo(size.height, 6);
  });

  it('com canvas sem tamanho não há conversão', () => {
    expect(screenToMap({ x: 10, y: 10 }, viewport, { width: 0, height: 0 })).toBeNull();
  });
});

describe('panViewport', () => {
  it('leva o dedo para a direita, o mundo para o oeste', () => {
    const panned = panViewport(viewport, 50, 0, size);
    const [oldLatitude, oldLongitude] = viewport.center;

    expect(panned.center[0]).toBeCloseTo(oldLatitude, 12);
    expect(panned.center[1]).toBeLessThan(oldLongitude);
  });

  it('leva o dedo para baixo, o mundo para o norte', () => {
    const panned = panViewport(viewport, 0, 50, size);
    const [oldLatitude] = viewport.center;

    expect(panned.center[0]).toBeGreaterThan(oldLatitude);
  });

  it('a volta da metade do canvas devolve o centro ao canto oposto exato', () => {
    const original = viewport.center;
    const across = panViewport(viewport, size.width, size.height, size);
    const back = panViewport(across, -size.width, -size.height, size);

    expect(back.center[0]).toBeCloseTo(original[0], 9);
    expect(back.center[1]).toBeCloseTo(original[1], 9);
  });
});

describe('zoomViewportAt', () => {
  it('aplica dois toques consecutivos na direção pedida', () => {
    const centerPoint = { x: size.width / 2, y: size.height / 2 };
    const atDefaultZoom = normalizeViewport(viewport, size);
    const zoomedInOnce = zoomViewportAt(atDefaultZoom, centerPoint, 1 / ZOOM_FACTOR, size);
    const zoomedInTwice = zoomViewportAt(zoomedInOnce, centerPoint, 1 / ZOOM_FACTOR, size);
    const zoomedOutOnce = zoomViewportAt(
      { ...zoomedInTwice, latitudeDelta: MIN_LATITUDE_DELTA },
      centerPoint,
      ZOOM_FACTOR,
      size,
    );
    const zoomedOutTwice = zoomViewportAt(zoomedOutOnce, centerPoint, ZOOM_FACTOR, size);

    expect(zoomedInOnce.latitudeDelta).toBeLessThan(atDefaultZoom.latitudeDelta);
    expect(zoomedInTwice.latitudeDelta).toBeCloseTo(MIN_LATITUDE_DELTA, 12);
    expect(zoomedOutOnce.latitudeDelta).toBeGreaterThan(zoomedInTwice.latitudeDelta);
    expect(zoomedOutTwice.latitudeDelta).toBeCloseTo(INITIAL_LATITUDE_DELTA, 12);
  });

  it('o ponto do centro é o âncora: ao dar zoom ele continua parado', () => {
    const centerPoint = { x: size.width / 2, y: size.height / 2 };
    const zoomed = zoomViewportAt(viewport, centerPoint, ZOOM_FACTOR, size);

    expect(zoomed.center).toEqual(viewport.center);
    expect(zoomed.latitudeDelta).toBeCloseTo(viewport.latitudeDelta * ZOOM_FACTOR, 12);
  });

  it('um canto do canvas fica sob o dedo durante o zoom', () => {
    const corner = { x: 40, y: 50 };
    const before = mapToScreen(
      screenToMap(corner, viewport, size) ?? INITIAL_CENTER,
      viewport,
      size,
    );
    const zoomed = zoomViewportAt(viewport, corner, 1.6, size);
    const after = mapToScreen(screenToMap(corner, zoomed, size) ?? INITIAL_CENTER, zoomed, size);

    expect(after.x).toBeCloseTo(before.x, 6);
    expect(after.y).toBeCloseTo(before.y, 6);
  });

  it('não atravessa os limites de zoom', () => {
    const tiny = {
      ...viewport,
      latitudeDelta: MIN_LATITUDE_DELTA,
      longitudeDelta: MIN_LATITUDE_DELTA * (size.width / size.height),
    };
    const zoomed = zoomViewportAt(tiny, { x: 0, y: 0 }, 0.001, size);

    expect(zoomed.latitudeDelta).toBe(MIN_LATITUDE_DELTA);
  });

  it('permite afastar depois de atingir o zoom in máximo', () => {
    const centerPoint = { x: size.width / 2, y: size.height / 2 };
    const maximumZoom = normalizeViewport(
      {
        ...viewport,
        latitudeDelta: MIN_LATITUDE_DELTA,
        longitudeDelta: MIN_LATITUDE_DELTA,
      },
      size,
    );
    const extraZoomIn = zoomViewportAt(maximumZoom, centerPoint, 1 / ZOOM_FACTOR, size);
    const zoomOut = zoomViewportAt(extraZoomIn, centerPoint, ZOOM_FACTOR, size);

    expect(extraZoomIn.latitudeDelta).toBeCloseTo(MIN_LATITUDE_DELTA, 12);
    expect(zoomOut.latitudeDelta).toBeGreaterThan(extraZoomIn.latitudeDelta);
    expect(zoomOut.latitudeDelta).toBeCloseTo(MIN_LATITUDE_DELTA * ZOOM_FACTOR, 12);
  });
});

describe('viewportForBounds e pointInBounds', () => {
  it('enquadra a caixa no centro, com folga', () => {
    const bounds = { north: -23.55, south: -23.5501, east: -46.63, west: -46.6301 };
    const fit = viewportForBounds(bounds, size);

    expect(fit).not.toBeNull();
    expect(fit?.center[0]).toBeCloseTo(-23.55005, 9);
    expect(fit?.center[1]).toBeCloseTo(-46.63005, 9);
    expect(fit?.latitudeDelta).toBeGreaterThan(bounds.north - bounds.south);
  });

  it('não aproxima além do zoom padrão ao reenquadrar conteúdo pequeno', () => {
    const bounds = { north: -23.55, south: -23.55001, east: -46.63, west: -46.63001 };
    const fit = viewportForBounds(bounds, size);

    expect(fit?.latitudeDelta).toBe(INITIAL_LATITUDE_DELTA);
  });

  it('sem caixa não há enquadramento', () => {
    expect(viewportForBounds(null, size)).toBeNull();
  });

  it('a borda pertence à caixa', () => {
    const bounds = { north: 1, south: -1, east: 2, west: -2 };

    expect(pointInBounds([1, 2], bounds)).toBe(true);
    expect(pointInBounds([0, 0], bounds)).toBe(true);
    expect(pointInBounds([1.1, 0], bounds)).toBe(false);
    expect(pointInBounds([0, 2.1], bounds)).toBe(false);
  });
});

describe('gridStepFor', () => {
  it('escolhe um passo da escada, nunca um número quebrado', () => {
    expect([0.0001, 0.0002, 0.0005, 0.001, 0.002, 0.005, 0.01, 0.02, 0.05]).toContain(
      gridStepFor(INITIAL_LATITUDE_DELTA, size),
    );
  });

  it('o passo cobre perto dos 48px alvo em qualquer zoom', () => {
    const steps = [MIN_LATITUDE_DELTA, INITIAL_LATITUDE_DELTA, MAX_LATITUDE_DELTA];

    for (const delta of steps) {
      const step = gridStepFor(delta, size);
      const pixels = (step / delta) * size.height;

      // O passo é da escada, então o pixel pode pular de faixa perto da borda
      // entre um degrau e outro — mas nunca sai de um fator de 10× do alvo.
      expect(pixels).toBeGreaterThanOrEqual(GRID_STEP_TARGET_PX / 10);
      expect(pixels).toBeLessThanOrEqual(GRID_STEP_TARGET_PX * 10);
    }
  });
});
