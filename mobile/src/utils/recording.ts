import type { Coordinate, LocationSample } from '@/types/coordinates';
import { distanceInMeters, isValidCoordinate } from '@/utils/geo';

/**
 * Política de descarte do que o GPS entrega durante a gravação de caminho.
 *
 * Existe porque o ponto gravado é dado, não lixo: a partir da Sprint 5 ele entra
 * no `Path.geometry`, e a partir da Sprint 17 vira aresta do grafo que o cálculo
 * de rota percorre (PRD §17). Descartar a correção ruim na hora da gravação é
 * mais barato do que qualquer configuração de precisão do aparelho — e é o único
 * jeito, porque a qualidade da leitura é decidida pela permissão concedida, não
 * pelo app.
 *
 * Três limiares, e cada um pega um defeito diferente do GPS dentro de um pavilhão:
 *
 * - **precisão**: dentro de prédio o sinal degrada e a leitura piora muito;
 * - **espaçamento**: parado, o sensor oscila alguns metros e polui o traçado com
 *   pontos que não representam deslocamento;
 * - **salto**: uma correção isolada longe do lugar onde a pessoa está vira um
 *   pico de dezenas de metros. A distância dividida pelo tempo desde o ponto
 *   anterior é o que separa a pessoa andando do sensor mentindo.
 *
 * Os números são de contexto, não de física: pavilhão é ambiente fechado, com
 * paredes e pessoas. Nenhum ponto é descartado por ser "errado" — o que entra no
 * traçado é a posição que o app afirma ter lido.
 */

/**
 * Precisão máxima aceita, em metros. 30 m é o piso do que ainda serve para
 * desenhar um trajeto interno: acima disso a curva já não acompanha o corredor.
 */
export const MAX_RECORDED_ACCURACY_M = 30;

/**
 * Espaçamento mínimo entre dois pontos gravados, em metros. Abaixo disso a
 * leitura é ruído do sensor parado, não deslocamento.
 */
export const MIN_POINT_SPACING_M = 1;

/**
 * Velocidade máxima aceita, em metros por segundo (cerca de 11 km/h). É bem
 * acima do passo humano e bem abaixo do salto de uma correção ruim, que aparece
 * como dezenas de metros em menos de um segundo.
 */
export const MAX_WALKING_SPEED_MPS = 3;

/**
 * Intervalo mínimo usado para calcular a velocidade entre dois pontos.
 *
 * Leituras com menos de um segundo de intervalo não têm divisão que preste: o
 * relógio do GPS não distingue 200 ms de 2 s com rigor, e a distância por tempo
 * vira ruído ampliado. Abaixo disso a leitura só passa pelos filtros de precisão
 * e espaçamento.
 */
export const MIN_SPEED_SAMPLE_MS = 1000;

/**
 * Por que uma leitura não entrou no traçado. O motivo serve para a tela explicar a
 * descarte — o PRD §9.2 mostra o status do GPS durante a gravação — e não só para
 * o código decidir em silêncio.
 */
export type SampleRejection = 'invalid' | 'inaccurate' | 'too-close' | 'jump';

export type SampleEvaluation =
  | { accepted: true; coordinate: Coordinate; distanceMeters: number }
  | { accepted: false; reason: SampleRejection };

function toCoordinate(sample: LocationSample): Coordinate {
  return [sample.latitude, sample.longitude];
}

/**
 * Decide se a leitura entra no trajeto, e de quanto é o trecho que ela acrescenta.
 *
 * A distância volta zero quando o ponto é descartado, e é por isso que o total
 * da tela é o comprimento do trajeto desenhado, e não o caminho percorrido. Somar
 * o trecho de uma leitura rejeitada contaria o mesmo metro várias vezes — três
 * leituras imprecisas em sequência dariam a mesma distância três vezes, todas
 * medidas contra o último ponto aceito.
 */
export function evaluateSample(
  previous: LocationSample | null,
  sample: LocationSample,
): SampleEvaluation {
  const coordinate = toCoordinate(sample);

  if (!isValidCoordinate(coordinate)) {
    return { accepted: false, reason: 'invalid' };
  }

  if (sample.accuracy !== null && sample.accuracy > MAX_RECORDED_ACCURACY_M) {
    return { accepted: false, reason: 'inaccurate' };
  }

  if (!previous) {
    return { accepted: true, coordinate, distanceMeters: 0 };
  }

  const distanceMeters = distanceInMeters(toCoordinate(previous), coordinate);

  if (distanceMeters < MIN_POINT_SPACING_M) {
    return { accepted: false, reason: 'too-close' };
  }

  const elapsedMs = sample.recordedAt - previous.recordedAt;
  if (elapsedMs >= MIN_SPEED_SAMPLE_MS) {
    const speedMps = distanceMeters / (elapsedMs / 1000);
    if (speedMps > MAX_WALKING_SPEED_MPS) {
      return { accepted: false, reason: 'jump' };
    }
  }

  return { accepted: true, coordinate, distanceMeters };
}

/**
 * Qualidade do sinal para o status do GPS na tela (PRD §9.2).
 *
 * `null` quando a leitura não traz precisão, e aí a tela não afirma nada sobre a
 * qualidade: escrever "sinal forte" sem dado seria inventar.
 */
export type GpsSignal = 'strong' | 'medium' | 'weak';

/** Faixas em metros, do melhor sinal ao pior. */
const SIGNAL_THRESHOLDS: readonly (readonly [GpsSignal, number])[] = [
  ['strong', 10],
  ['medium', MAX_RECORDED_ACCURACY_M],
];

/** Nome de cada qualidade, para o texto da tela. */
export const GPS_SIGNAL_LABELS: Record<GpsSignal, string> = {
  strong: 'Sinal forte',
  medium: 'Sinal médio',
  weak: 'Sinal fraco',
};

export function gpsSignalFrom(accuracy: number | null | undefined): GpsSignal | null {
  if (accuracy === null || accuracy === undefined || !Number.isFinite(accuracy)) return null;

  for (const [signal, ceiling] of SIGNAL_THRESHOLDS) {
    if (accuracy <= ceiling) return signal;
  }

  return 'weak';
}
