import type { Coordinate } from '@/types/coordinates';
import { degreeDistanceInMeters, distanceInMeters, isValidCoordinate } from '@/utils/geo';

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
