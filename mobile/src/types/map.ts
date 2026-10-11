import type { PoiRect } from '@/utils/poiAnchor';

import type { Coordinate } from './coordinates';
import type { IconName } from './icon';

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
  /**
   * Chamado enquanto alguém arrasta o marcador.
   *
   * É o `draggable`/`onDrag` do `Marker`, que a biblioteca implementa na
   * plataforma — não um `PanResponder` nosso. O gesto de arrastar o ícone é o
   * atalho de mover o ponto; a porta do toque continua sendo tocar no mapa, que
   * funciona sem arrasto (RNF04).
   *
   * O callback entrega a coordenada no formato gravado, como o `onPress` do
   * marcador e o `onMapPress`: quem chama nunca vê o `LatLng`.
   */
  onDrag?: (coordinate: Coordinate) => void;
  /**
   * Ícone do marcador.
   *
   * Vem do `PoiType` pelo `poiIcon` — é o que faz o banheiro ter o desenho do
   * banheiro e a escada o da escada, em vez de treze pinos iguais que obrigam a
   * pessoa a ler a lista para saber o que é o quê. Ausente, o marcador usa o pino
   * genérico, que é o caso do ponto em rascunho e do contexto que não é POI.
   *
   * O tipo é `IconName` de `types/icon.ts` e não `string`: um nome fora do
   * catálogo renderizaria `null` em silêncio, que foi o bug que a Sprint 7
   * encontrou em sete nomes.
   */
  icon?: IconName;
  /**
   * Chamado quando alguém toca no marcador.
   *
   * Por fechamento, como o `onPress` da polilinha: o evento de toque do mapa é
   * opcional no tipo do `react-native-maps`, então quem sabe qual ponto foi
   * tocado é o próprio marcador. Sem este callback o pino não vira alvo de
   * toque, que é o que a tela do participante quer — lá o mapa é consulta.
   */
  onPress?: () => void;
};

/**
 * Retângulo de um ponto de interesse, desenhado no mapa.
 *
 * O retângulo é o que o organizador marca ("é aqui") e o ícone fica ancorado
 * dentro dele, então os dois andam juntos: quem salva um POI grava `rect` e
 * `anchor`, e a API devolve o `position` do ícone derivado dos dois. Ver
 * `utils/poiAnchor.ts`.
 *
 * **As coordenadas são geográficas, não de tela.** Um retângulo guardado em pixels
 * descolaria do lugar assim que a câmera desse mapa mudasse de zoom, e a Sprint 7
 * descobre isso no aparelho: o ponto nascia certo e, ao dar zoom, ficava no canto
 * errado. Por isso o `EventMap` desenha o retângulo com `Polygon` — as mesmas
 * coordenadas que o banco guarda.
 */
export type MapRect = {
  id: string;
  rect: PoiRect;
  tone?: MapTone;
  /** Quando existe, o retângulo é a marcação do ponto em edição no formulário. */
  editable?: boolean;
  /** Ao arrastar uma alça de canto, devolve o retângulo novo. */
  onResize?: (rect: PoiRect) => void;
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
  /**
   * Quando existe, este trajeto é o que a tela está ajustando no mapa — e ele é
   * o único editável do `EventMap`, como o retângulo em edição.
   *
    * A existência do par `onPreview`/`onCommit` é o que liga a camada de
    * interação (alças dos vértices existentes). Sem ele o trajeto continua
    * sendo só desenho, como nas telas de consulta.
   */
  editable?: boolean;
  /**
   * Chamado a cada movimento do arraste, com o trajeto novo (pré-visualização).
   *
   * É o mesmo desenho do `onResize` do retângulo: a tela guarda o rascunho no
   * seu estado e o desenho acompanha o dedo. A substituição é absoluta — o
   * trajeto completo vem a cada `move` — e não um delta, então partir do
   * rascunho anterior dá exatamente o mesmo resultado que partir do começo do
   * gesto (o contrato que `moveVertex` fixa em teste).
   */
  onPreview?: (geometry: MapGeometry) => void;
  /**
   * Chamado uma única vez, ao soltar: o ajuste do gesto está confirmado, e a
   * tela marca o rascunho como alterado.
   *
   * Separar `onPreview` de `onCommit` é o que permite arrastar à vontade sem
   * reenquadrar a câmera a cada quadro nem recalcular o que está salvo: o
   * rascunho muda livremente, e o "isto é uma alteração" só nasce no soltar.
   */
  onCommit?: (geometry: MapGeometry) => void;
};
