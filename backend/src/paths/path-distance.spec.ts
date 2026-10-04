import type { CoordinateTuple } from '../common/is-coordinate.js';

import { pathLengthInMeters } from './path-distance.js';

/** 0,001 grau de latitude no Equador vale 111,19 m. */
const METER_PER_TENTH_OF_DEGREE = 111.2;

function at(latitude: number, longitude = 0): CoordinateTuple {
  return [latitude, longitude];
}

describe('pathLengthInMeters', () => {
  it('returns zero for an empty trail', () => {
    expect(pathLengthInMeters([])).toBe(0);
  });

  it('returns zero for a single point', () => {
    expect(pathLengthInMeters([at(0)])).toBe(0);
  });

  it('measures a straight segment', () => {
    expect(pathLengthInMeters([at(0), at(0.001)])).toBe(
      METER_PER_TENTH_OF_DEGREE,
    );
  });

  it('sums the segments of a corner instead of measuring end to end', () => {
    const trail: CoordinateTuple[] = [at(0), at(0.001), at(0.001, 0.001)];

    // A soma vale o dobro do deslocamento: quem percorre o corredor em `L` caminha
    // os dois trechos, e a distância do caminho é o que a pessoa sente.
    expect(pathLengthInMeters(trail)).toBe(METER_PER_TENTH_OF_DEGREE * 2);
  });

  it('counts the walk back and forth', () => {
    expect(pathLengthInMeters([at(0), at(0.001), at(0)])).toBe(
      METER_PER_TENTH_OF_DEGREE * 2,
    );
  });

  it('adds nothing for repeated points', () => {
    const trail: CoordinateTuple[] = [at(0), at(0), at(0.001)];

    expect(pathLengthInMeters(trail)).toBe(METER_PER_TENTH_OF_DEGREE);
  });

  it('rounds to the tenth of a meter', () => {
    const trail: CoordinateTuple[] = [at(0), at(0.000123)];

    expect(pathLengthInMeters(trail)).toBe(13.7);
  });

  it('does not depend on the longitude scale', () => {
    // Um grau de longitude encurta com a latitude: 111,19 m na linha do Equador e
    // cerca de 78,6 m no paralelo 45, porque o raio da circunferência de
    // longitude é `R * cos(latitude)`.
    const atEquator = pathLengthInMeters([at(0, 0), at(0, 0.001)]);
    const at45 = pathLengthInMeters([at(45, 0), at(45, 0.001)]);

    expect(atEquator).toBeGreaterThan(at45);
    expect(at45).toBe(78.6);
  });
});
