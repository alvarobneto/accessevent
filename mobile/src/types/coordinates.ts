/** Coordenada geográfica usada em todo o projeto. */
export type Coordinates = {
  latitude: number;
  longitude: number;
  /** Raio de incerteza do sinal GPS, em metros. `null` quando desconhecido. */
  accuracy: number | null;
};

/**
 * Uma leitura do GPS com o instante em que foi tirada.
 *
 * `Coordinates` é a posição; a gravação de caminho precisa também do tempo, e é
 * a distância dividida pelo tempo que separa um ponto bom de um salto ruim do
 * sensor (ver `evaluateSample`). O carimbo é o `timestamp` do `expo-location`,
 * que é o relógio do aparelho — relógio do servidor não serviria para nada aqui.
 */
export type LocationSample = Coordinates & {
  /** Epoch em milissegundos, no fuso do aparelho. */
  recordedAt: number;
};

export type Coordinate = readonly [latitude: number, longitude: number];
