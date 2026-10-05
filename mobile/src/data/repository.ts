import type { MapGeometry } from '@/types/map';

import type { Event, EventCategory, EventCategoryCount, NavigationMap, Path } from './types';

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
  /** `DELETE /paths/:pathId`: apaga o caminho e tira o trajeto do mapa. */
  deletePath(pathId: string): Promise<void>;
}
