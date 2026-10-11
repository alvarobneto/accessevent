import type { MapGeometry } from '@/types/map';
import type { PoiAnchor, PoiRect } from '@/utils/poiAnchor';

import type {
  Event,
  EventCategory,
  EventCategoryCount,
  NavigationMap,
  Path,
  PointOfInterest,
  PoiType,
} from './types';

export type NewEvent = {
  name: string;
  description?: string | null;
  address?: string | null;
  /** `YYYY-MM-DD` ou `null`. */
  startDate?: string | null;
  endDate?: string | null;
  /** Categoria do evento, ou `null` para remover. */
  category?: EventCategory | null;
};

/** Campos que o `PATCH /events/:id` aceita; todos são opcionais. */
export type EventChanges = Partial<NewEvent>;

export type NewNavigationMap = {
  eventId: string;
  name: string;
};

/**
 * Caminho a gravar: a navegação dona dele e o trajeto.
 *
 * Sem `distance` de propósito — a API deriva o valor da geometria e devolvê-lo
 * errado seria aceitar dois números para a mesma medida.
 */
export type NewPath = {
  mapId: string;
  geometry: MapGeometry;
};

/**
 * Campos que o `PATCH /paths/:pathId` aceita; todos são opcionais.
 *
 * Só o `name` por enquanto: o trajeto gravado não é reescrito por esse endpoint,
 * e o editor de vértices vai precisar de um contrato próprio para isso.
 */
export type PathChanges = {
  name?: string;
};

/**
 * Contrato de armazenamento.
 *
 * As telas só conhecem esta interface, então trocar entre a API do backend e o
 * repositório em memória não exige mudá-las.
 */
export interface AppRepository {
  listEvents(category?: EventCategory): Promise<Event[]>;
  /** Categorias que têm ao menos um evento, com a contagem de cada uma. */
  listEventCategories(): Promise<EventCategoryCount[]>;
  createEvent(input: NewEvent): Promise<Event>;
  getEvent(eventId: string): Promise<Event | null>;
  updateEvent(eventId: string, changes: EventChanges): Promise<Event>;
  /** `DELETE /events/:eventId`: apaga o evento e as navegações dele. */
  deleteEvent(eventId: string): Promise<void>;

  listNavigationMaps(eventId: string): Promise<NavigationMap[]>;
  createNavigationMap(input: NewNavigationMap): Promise<NavigationMap>;
  getNavigationMap(mapId: string): Promise<NavigationMap | null>;
  renameNavigationMap(mapId: string, name: string): Promise<NavigationMap>;
  deleteNavigationMap(mapId: string): Promise<void>;

  /** Caminhos da navegação, na ordem em que foram gravados. */
  listPaths(mapId: string): Promise<Path[]>;
  createPath(input: NewPath): Promise<Path>;
  getPath(pathId: string): Promise<Path | null>;
  /** `PATCH /paths/:pathId`: renomeia o caminho sem tocar no trajeto. */
  updatePath(pathId: string, changes: PathChanges): Promise<Path>;
  /**
   * `PATCH /paths/:pathId/geometry`: substitui o trajeto pelo ajuste manual no
   * mapa. A distância é recalculada pela API — igual na gravação, o cliente não
   * manda `distance`.
   */
  replacePathGeometry(pathId: string, geometry: MapGeometry): Promise<Path>;
  /** `DELETE /paths/:pathId`: apaga o caminho e tira o trajeto do mapa. */
  deletePath(pathId: string): Promise<void>;

  /** Pontos de interesse da navegação. */
  listPois(mapId: string): Promise<PointOfInterest[]>;
  createPoi(input: NewPointOfInterest): Promise<PointOfInterest>;
  getPoi(poiId: string): Promise<PointOfInterest | null>;
  updatePoi(poiId: string, changes: PoiChanges): Promise<PointOfInterest>;
  deletePoi(poiId: string): Promise<void>;
}

/**
 * O que o app **grava** de um ponto de interesse.
 *
 * Manda `rect` e `anchor`, nunca `position`: a API deriva o ponto absoluto, e
 * mandar os três deixaria o banco aceitar um `position` que não corresponde ao
 * retângulo — o estado que ninguém quis. Ver `utils/poiAnchor.ts`.
 */
export type NewPointOfInterest = {
  mapId: string;
  name: string;
  type: PoiType;
  rect: PoiRect;
  anchor: PoiAnchor;
  description?: string | null;
  accessibilityInfo?: string | null;
};

export type PoiChanges = Partial<NewPointOfInterest>;
