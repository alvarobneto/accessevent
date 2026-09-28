/** Coordenada geográfica usada em todo o projeto. */
export type Coordinates = {
  latitude: number;
  longitude: number;
  /** Raio de incerteza do sinal GPS, em metros. `null` quando desconhecido. */
  accuracy: number | null;
};

export type Coordinate = readonly [latitude: number, longitude: number];
