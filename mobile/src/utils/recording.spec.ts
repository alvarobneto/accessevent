import type { LocationSample } from '@/types/coordinates';
import {
  evaluateSample,
  gpsSignalFrom,
  MAX_RECORDED_ACCURACY_M,
  MAX_WALKING_SPEED_MPS,
  MIN_POINT_SPACING_M,
} from '@/utils/recording';

/** Uma leitura em cima de uma referência: 0 m de erro, 1 s de intervalo. */
function sampleAt(
  latitude: number,
  longitude: number,
  overrides: Partial<LocationSample> = {},
): LocationSample {
  return {
    latitude,
    longitude,
    accuracy: 5,
    recordedAt: 1_000,
    ...overrides,
  };
}

const ORIGIN = sampleAt(-8.047_6, -34.877);

describe('evaluateSample', () => {
  it('aceita a primeira leitura, sem trecho', () => {
    const evaluation = evaluateSample(null, ORIGIN);

    expect(evaluation).toEqual({
      accepted: true,
      coordinate: [-8.047_6, -34.877],
      distanceMeters: 0,
    });
  });

  it('soma o trecho entre dois pontos aceitos', () => {
    const evaluation = evaluateSample(ORIGIN, sampleAt(-8.048_6, -34.877));

    expect(evaluation.accepted).toBe(true);
    expect(evaluation.accepted && evaluation.distanceMeters).toBeCloseTo(111, 0);
  });

  it('descarta coordenada fora do globo', () => {
    const evaluation = evaluateSample(ORIGIN, sampleAt(91, -34.877));

    expect(evaluation).toEqual({ accepted: false, reason: 'invalid' });
  });

  it(`descarta leitura pior que ${MAX_RECORDED_ACCURACY_M} m`, () => {
    const evaluation = evaluateSample(
      ORIGIN,
      sampleAt(-8.048_6, -34.877, { accuracy: MAX_RECORDED_ACCURACY_M + 0.1 }),
    );

    expect(evaluation).toEqual({ accepted: false, reason: 'inaccurate' });
  });

  it('aceita leitura exatamente no limite de precisão', () => {
    const evaluation = evaluateSample(
      ORIGIN,
      sampleAt(-8.048_6, -34.877, { accuracy: MAX_RECORDED_ACCURACY_M }),
    );

    expect(evaluation.accepted).toBe(true);
  });

  it('descarta leitura sem precisão conhecida só quando o resto reprova', () => {
    const evaluation = evaluateSample(ORIGIN, sampleAt(-8.048_6, -34.877, { accuracy: null }));

    expect(evaluation.accepted).toBe(true);
  });

  it('ignora oscilação do sensor parado', () => {
    const evaluation = evaluateSample(
      ORIGIN,
      sampleAt(-8.047_6 + MIN_POINT_SPACING_M / 2 / 111_320, -34.877),
    );

    expect(evaluation).toEqual({ accepted: false, reason: 'too-close' });
  });

  it('descarta salto de posição que ninguém percorreu', () => {
    // 40 m em 1 s são 40 m/s, e ninguém caminha a 144 km/h.
    const evaluation = evaluateSample(ORIGIN, sampleAt(-8.048_0, -34.877, { recordedAt: 2_000 }));

    expect(evaluation).toEqual({ accepted: false, reason: 'jump' });
  });

  it('aceita o passo de quem caminha na velocidade de caminhada', () => {
    const step = (MAX_WALKING_SPEED_MPS * 0.8) / 111_320;

    const evaluation = evaluateSample(
      ORIGIN,
      sampleAt(-8.047_6 + step, -34.877, {
        recordedAt: 2_000,
      }),
    );

    expect(evaluation.accepted).toBe(true);
  });

  it('não julga velocidade quando o intervalo é curto demais para dividir', () => {
    // 40 m em 200 ms é indistinguível de 40 m em 2 s: o relógio do GPS não tem
    // resolução para isso, e o filtro de salto não pode reprovar por adivinhação.
    const evaluation = evaluateSample(ORIGIN, sampleAt(-8.048_0, -34.877, { recordedAt: 1_200 }));

    expect(evaluation.accepted).toBe(true);
  });

  it('não troca a referência do filtro quando o ponto é descartado', () => {
    const jumped = evaluateSample(ORIGIN, sampleAt(-8.048_0, -34.877, { recordedAt: 2_000 }));
    expect(jumped.accepted).toBe(false);

    // Quem chamou guarda `ORIGIN` como referência, porque o salto não entrou no
    // trajeto: se a referência passasse a ser o ponto do salto, o passo seguinte
    // pareceria outro teleporte e o trajeto nunca mais cresceria.
    const step = sampleAt(-8.047_61, -34.877, { recordedAt: 3_000 });

    expect(evaluateSample(ORIGIN, step).accepted).toBe(true);
  });
});

describe('gpsSignalFrom', () => {
  it('classifica a precisão nas faixas do status do GPS', () => {
    expect(gpsSignalFrom(4)).toBe('strong');
    expect(gpsSignalFrom(10)).toBe('strong');
    expect(gpsSignalFrom(11)).toBe('medium');
    expect(gpsSignalFrom(MAX_RECORDED_ACCURACY_M)).toBe('medium');
    expect(gpsSignalFrom(MAX_RECORDED_ACCURACY_M + 1)).toBe('weak');
  });

  it('não afirma qualidade quando a leitura não trouxe precisão', () => {
    expect(gpsSignalFrom(null)).toBeNull();
    expect(gpsSignalFrom(undefined)).toBeNull();
    expect(gpsSignalFrom(Number.NaN)).toBeNull();
  });
});
