import { api, ApiError } from '@/services/apiClient';

import type { AppRepository, EventChanges, NewEvent, NewNavigationMap } from './repository';
import type { Event, NavigationMap } from './types';

/**
 * `AppRepository` sobre a API do backend (Sprint 2).
 *
 * Duas adaptações em relação ao contrato: a API responde `404` e não `null`
 * quando o registro não existe, então os `get*` convertem para `null`; e o
 * corpo do `POST /events` é enviado sem chaves `undefined`, porque a API
 * rejeita com `400` qualquer campo fora do contrato (`forbidNonWhitelisted`).
 * Os `delete*` não têm retorno porque o `DELETE` responde `204` sem corpo.
 */
function isNotFound(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404;
}

/** Remove chaves `undefined` para não mandá-las como campo ausente. */
function compact<T extends object>(input: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined),
  ) as Partial<T>;
}

export function createHttpRepository(): AppRepository {
  return {
    async listEvents() {
      return api.get<Event[]>('/events');
    },

    async createEvent(input: NewEvent) {
      return api.post<Event>('/events', compact(input));
    },

    async getEvent(eventId) {
      try {
        return await api.get<Event>(`/events/${eventId}`);
      } catch (error) {
        if (isNotFound(error)) return null;
        throw error;
      }
    },

    async updateEvent(eventId: string, changes: EventChanges) {
      return api.patch<Event>(`/events/${eventId}`, compact(changes));
    },

    async deleteEvent(eventId) {
      await api.delete<void>(`/events/${eventId}`);
    },

    async listNavigationMaps(eventId) {
      return api.get<NavigationMap[]>(`/events/${eventId}/maps`);
    },

    async createNavigationMap({ eventId, name }: NewNavigationMap) {
      return api.post<NavigationMap>(`/events/${eventId}/maps`, { name });
    },

    async getNavigationMap(mapId) {
      try {
        return await api.get<NavigationMap>(`/maps/${mapId}`);
      } catch (error) {
        if (isNotFound(error)) return null;
        throw error;
      }
    },

    async renameNavigationMap(mapId, name) {
      return api.patch<NavigationMap>(`/maps/${mapId}`, { name });
    },

    async deleteNavigationMap(mapId) {
      await api.delete<void>(`/maps/${mapId}`);
    },
  };
}
