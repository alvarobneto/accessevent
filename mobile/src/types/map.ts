import type { Coordinate } from './coordinates';

/**
 * Geometria do mapa: coordenadas em ordem, do início ao fim do trajeto.
 *
 * Este é o formato que `Path.geometry` guarda no banco (PRD §23) e o que a API
 * devolve: uma lista de pares `[latitude, longitude]` em graus decimais, em JSON
 * puro. O PRD §25 deixa o PostGIS como opção e permite JSON para o MVP, então a
 * mesma forma vale no app, no banco e na resposta — nenhuma borda de conversão
 * além de propriedade para objeto, que está em `utils/geo.ts`.
 */
export type MapGeometry = readonly Coordinate[];

/**
 * Tom do desenho no mapa.
 *
 * - `default`: o trajeto como o organizador desenhou, em `primary`;
 * - `highlight`: o que a tela está mostrando naquele momento — a rota calculada
 *   da Sprint 18;
 * - `muted`: contexto, um caminho fora da rota ativa na Sprint 17.
 *
 * A cor só distingue o que está em foco. O mapa nunca pinta um caminho de
 * "verde" para dizer que ele serve: a acessibilidade é informação do
 * organizador, e ela aparece em texto e atributo (PRD §19), não na cor da linha.
 */
export type MapTone = 'default' | 'highlight' | 'muted';

/**
 * Marcador do mapa: um ponto do desenho do organizador, os `PointOfInterest` do
 * PRD §8.1 — identificador, nome, descrição e posição.
 */
export type MapMarker = {
  id: string;
  coordinate: Coordinate;
  /** Nome do ponto; vira o título do balão do marcador. */
  label: string;
  /** Segunda linha do balão, quando o ponto tiver descrição. */
  description?: string;
  tone?: MapTone;
};

/**
 * Polilinha do mapa: o trajeto de um `Path` do PRD §8.2. `Path` ganha os nós de
 * ponta, a distância e os atributos de acessibilidade nas Sprints 5 e 9; o desenho
 * na tela é só a geometria.
 */
export type MapPolyline = {
  id: string;
  geometry: MapGeometry;
  tone?: MapTone;
  /**
   * Chamado quando alguém toca no trajeto.
   *
   * O evento de `polyline-press` traz um `id` que só existe no Google Maps do iOS
   * (é opcional em `PolylinePressEvent`), então quem sabe qual caminho foi tocado
   * é a própria polilinha, por fechamento — e não um único `onPolylinePress` no
   * mapa. É o que o `react-native-maps` faz nas duas plataformas: o toque é
   * despachado para a polilinha específica, não para o mapa.
   */
  onPress?: () => void;
};
