import type { Event, NavigationMap } from './types';

export type NewEvent = {
  name: string;
  description?: string | null;
  address?: string | null;
  /** `YYYY-MM-DD` ou `null`. */
  startDate?: string | null;
  endDate?: string | null;
};

/** Campos que o `PATCH /events/:id` aceita; todos são opcionais. */
export type EventChanges = Partial<NewEvent>;

export type NewNavigationMap = {
  eventId: string;
  name: string;
};

/**
 * Contrato de armazenamento.
 *
 * As telas só conhecem esta interface, então trocar entre a API do backend e o
 * repositório em memória não exige mudá-las.
 */
export interface AppRepository {
  listEvents(): Promise<Event[]>;
  createEvent(input: NewEvent): Promise<Event>;
  getEvent(eventId: string): Promise<Event | null>;
  updateEvent(eventId: string, changes: EventChanges): Promise<Event>;

  listNavigationMaps(eventId: string): Promise<NavigationMap[]>;
  createNavigationMap(input: NewNavigationMap): Promise<NavigationMap>;
  getNavigationMap(mapId: string): Promise<NavigationMap | null>;
  renameNavigationMap(mapId: string, name: string): Promise<NavigationMap>;
}
