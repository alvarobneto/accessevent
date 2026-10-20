import type { Coordinate } from '@/types/coordinates';
import type { MapGeometry } from '@/types/map';
import {
  DEFAULT_MAP_DELTA,
  degreeDistanceInMeters,
  distanceInMeters,
  geometryLengthInMeters,
  isValidCoordinate,
  MINIMUM_DELTA,
  regionForCoordinate,
  regionForGeometryInViewport,
} from '@/utils/geo';

/** Recife, onde fica o Centro de Convivência Cultural da UFPE. */
const RECIFE: Coordinate = [-8.047_6, -34.877];

describe('distanceInMeters', () => {
  it('é zero no mesmo ponto', () => {
    expect(distanceInMeters(RECIFE, RECIFE)).toBe(0);
  });

  it('mede um grau de latitude com a ordem de grandeza da Terra', () => {
    const meters = distanceInMeters(RECIFE, [-7.047_6, -34.877]);

    expect(meters).toBeGreaterThan(110_000);
    expect(meters).toBeLessThan(112_000);
  });

  it('é simétrica', () => {
    const to = [-8.048_6, -34.878_6] as const;

    expect(distanceInMeters(RECIFE, to)).toBeCloseTo(distanceInMeters(to, RECIFE), 6);
  });

  it('cresce com o deslocamento', () => {
    const near = distanceInMeters(RECIFE, [-8.047_7, -34.877]);
    const far = distanceInMeters(RECIFE, [-8.048_7, -34.877]);

    expect(far).toBeGreaterThan(near * 5);
  });
});

describe('degreeDistanceInMeters', () => {
  it('converte o deslocamento em graus para metros', () => {
    const meters = degreeDistanceInMeters(
      { latitude: -8.047_6, longitude: -34.877 },
      { latitude: -8.046_6, longitude: -34.877 },
    );

    expect(meters).toBeCloseTo(111, 0);
  });

  it('vale a mesma distância da haversine na escala do gravador', () => {
    const to: Coordinate = [-8.048_6, -34.877];

    expect(
      degreeDistanceInMeters(
        { latitude: RECIFE[0], longitude: RECIFE[1] },
        {
          latitude: to[0],
          longitude: to[1],
        },
      ),
    ).toBeCloseTo(distanceInMeters(RECIFE, to), 0);
  });
});

describe('regionForCoordinate', () => {
  it('usa o mesmo zoom inicial padrão que os demais mapas', () => {
    expect(regionForCoordinate(RECIFE).latitudeDelta).toBe(DEFAULT_MAP_DELTA);
    expect(regionForCoordinate(RECIFE).longitudeDelta).toBe(DEFAULT_MAP_DELTA);
  });
});

describe('regionForGeometryInViewport', () => {
  it('usa os extremos da rota e a aproxima até ocupar a área disponível', () => {
    const route: MapGeometry = [
      [-0.0002, -0.0001],
      [0, 0],
      [0.0002, 0.0001],
    ];

    const region = regionForGeometryInViewport(route, 400, 400, 20);

    expect(region?.latitude).toBe(0);
    expect(region?.longitude).toBe(0);
    expect(region?.latitudeDelta).toBeCloseTo(0.0004 * (400 / 360), 12);
    expect(region?.longitudeDelta).toBeCloseTo(region?.latitudeDelta ?? 0, 12);
  });

  it('mantém o zoom mínimo e devolve null sem coordenadas válidas ou sem tamanho', () => {
    expect(regionForGeometryInViewport([RECIFE], 400, 400)?.latitudeDelta).toBe(MINIMUM_DELTA);
    expect(regionForGeometryInViewport([], 400, 400)).toBeNull();
    expect(regionForGeometryInViewport([RECIFE], 0, 400)).toBeNull();
  });
});

describe('isValidCoordinate', () => {
  it('aceita coordenada dentro do globo', () => {
    expect(isValidCoordinate(RECIFE)).toBe(true);
  });

  it('recusa latitude e longitude fora da faixa', () => {
    expect(isValidCoordinate([91, 0])).toBe(false);
    expect(isValidCoordinate([-91, 0])).toBe(false);
    expect(isValidCoordinate([0, 181])).toBe(false);
    expect(isValidCoordinate([Number.NaN, 0])).toBe(false);
  });

  it('recusa coordenada ausente', () => {
    expect(isValidCoordinate(null)).toBe(false);
    expect(isValidCoordinate(undefined)).toBe(false);
  });
});

describe('geometryLengthInMeters', () => {
  it('é zero para uma geometria vazia ou de um ponto', () => {
    expect(geometryLengthInMeters([])).toBe(0);
    expect(geometryLengthInMeters([RECIFE])).toBe(0);
  });

  it('soma os trechos em vez de medir a ponta à ponta', () => {
    // Ida e volta de meio grau: o percurso é o dobro do deslocamento, e é o
    // percurso que a pessoa sente ao andar o corredor de um pavilhão.
    const trail: MapGeometry = [RECIFE, [-7.547_6, -34.877], RECIFE];
    const oneWay = distanceInMeters(RECIFE, [-7.547_6, -34.877]);

    expect(geometryLengthInMeters(trail)).toBeCloseTo(oneWay * 2, 1);
  });

  it('arredonda para a décima de metro, igual ao backend', () => {
    const trail: MapGeometry = [RECIFE, [-8.047_7, -34.877]];

    expect(geometryLengthInMeters(trail)).toBe(
      Math.round(distanceInMeters(RECIFE, [-8.047_7, -34.877]) * 10) / 10,
    );
  });
});
