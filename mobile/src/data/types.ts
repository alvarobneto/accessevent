import type { MapGeometry } from '@/types/map';
import type { Coordinate } from '@/types/coordinates';
import type { PoiAnchor, PoiRect } from '@/utils/poiAnchor';

/**
 * Tipos do domínio. Os nomes seguem o modelo do PRD §23, em inglês, e a
 * nomenclatura de produto em português fica na interface.
 *
 * Os campos opcionais são `null` (e não string vazia) porque é o que a API
 * devolve; a API normaliza string vazia em `NULL` ao gravar.
 */
/**
 * Categoria do evento. As chaves são as mesmas validadas pela API
 * (`EVENT_CATEGORIES` no backend); os rótulos pt-BR ficam em
 * `src/utils/event-categories.ts`.
 */
export type EventCategory =
  | 'cultura'
  | 'tecnologia'
  | 'musica'
  | 'esportes'
  | 'gastronomia'
  | 'educacao'
  | 'negocios'
  | 'saude'
  | 'religiao'
  | 'outros';

/** Categoria com a quantidade de eventos cadastrados nela. */
export type EventCategoryCount = {
  category: EventCategory;
  eventsCount: number;
};

export type Event = {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  /** `YYYY-MM-DD`, ou `null` quando o evento não tem data. */
  startDate: string | null;
  endDate: string | null;
  category: EventCategory | null;
  createdAt: string;
  updatedAt: string;
};

/** Navegação: um mapa do evento. É a entidade `Map` do PRD §23 */
export type NavigationMap = {
  id: string;
  eventId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

/**
 * Caminho: um trecho desenhado pelo organizador. É a entidade `Path` do PRD §23,
 * e nasce na Sprint 5 só com o que a gravação produz — geometria e distância.
 *
 * `distance` **não volta na escrita**: o servidor calcula a partir da geometria e
 * devolve o valor, então o número que a tela mostra durante a gravação e o que
 * fica gravado vêm da mesma conta. `name` chega na Sprint 6 e é `null` enquanto o
 * organizador não nomeou o caminho: a lista precisa distinguir "sem nome" de
 * "nomeado" para não prometer um nome que não existe. `startNodeId`/`endNodeId` e
 * os atributos de acessibilidade chegam nas Sprints 7 e 9, cada um com seu campo.
 */
export type Path = {
  id: string;
  mapId: string;
  geometry: MapGeometry;
  /** Distância estimada, em metros. */
  distance: number;
  /** Nome que o organizador deu ao caminho, ou `null` se ele ainda não nomeou. */
  name: string | null;
  createdAt: string;
  updatedAt: string;
};

export const PoiTypeValues = [
  'Entrada',
  'Saída',
  'Banheiro',
  'Banheiro acessível',
  'Elevador',
  'Escada',
  'Rampa',
  'Auditório',
  'Sala',
  'Alimentação',
  'Atendimento',
  'Posto médico',
  'Outro',
] as const;

export type PoiType = (typeof PoiTypeValues)[number];

/** Ponto de interesse (PRD §23). */
export type PointOfInterest = {
  id: string;
  mapId: string;
  name: string;
  type: PoiType;
  /** Retângulo que marca o ponto; o que o organizador desenha no mapa. */
  rect: PoiRect;
  /** Onde o ícone está dentro do retângulo. */
  anchor: PoiAnchor;
  /**
   * Posição absoluta do ícone, **derivada** pela API de `rect` + `anchor`.
   *
   * Continua no tipo porque é o que o marcador e a câmera consomem, e nenhum dos
   * dois deveria reconstruir a geometria do retângulo para desenhar um pino.
   */
  position: Coordinate;
  description: string | null;
  accessibilityInfo: string | null;
  createdAt: string;
  updatedAt: string;
};
