import { api, ApiError } from '@/services/apiClient';

import type {
  AppRepository,
  AreaChanges,
  EventChanges,
  NewEvent,
  NewNavigationMap,
  NewPath,
  NewArea,
} from './repository';
import type { Area, Event, EventCategoryCount, NavigationMap, Path, PointOfInterest } from './types';

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
    async listEvents(category) {
      const query = category ? `?category=${encodeURIComponent(category)}` : '';
      return api.get<Event[]>(`/events${query}`);
    },

    async listEventCategories() {
      return api.get<EventCategoryCount[]>('/events/categories');
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

    async listPaths(mapId) {
      return api.get<Path[]>(`/maps/${mapId}/paths`);
    },

    async createPath({ mapId, geometry }: NewPath) {
      // Só a geometria vai no corpo: a API calcula a distância, e mandar o valor
      // calculado aqui faria o servidor responder 400 pelo campo fora do contrato.
      return api.post<Path>(`/maps/${mapId}/paths`, { geometry });
    },

    async getPath(pathId) {
      try {
        return await api.get<Path>(`/paths/${pathId}`);
      } catch (error) {
        if (isNotFound(error)) return null;
        throw error;
      }
    },

    async updatePath(pathId, changes) {
      return api.patch<Path>(`/paths/${pathId}`, compact(changes));
    },

    async replacePathGeometry(pathId, geometry) {
      // Só a geometria no corpo: a API recalcula a distância, como na gravação.
      return api.patch<Path>(`/paths/${pathId}/geometry`, { geometry });
    },

    async deletePath(pathId) {
      await api.delete<void>(`/paths/${pathId}`);
    },

    async listPois(mapId) {
      return api.get<PointOfInterest[]>(`/maps/${mapId}/pois`);
    },

    async createPoi(input) {
      const { mapId, ...body } = input;
      return api.post<PointOfInterest>(`/maps/${mapId}/pois`, compact(body as any));
    },

    async getPoi(poiId) {
      try {
        return await api.get<PointOfInterest>(`/pois/${poiId}`);
      } catch (error) {
        if (isNotFound(error)) return null;
        throw error;
      }
    },

    async updatePoi(poiId, changes) {
      return api.patch<PointOfInterest>(`/pois/${poiId}`, compact(changes));
    },

    async deletePoi(poiId) {
      await api.delete<void>(`/pois/${poiId}`);
    },

    async listAreas(mapId) {
      return api.get<Area[]>(`/maps/${mapId}/areas`);
    },

    async createArea({ mapId, ...body }: NewArea) {
      return api.post<Area>(`/maps/${mapId}/areas`, compact(body));
    },

    async updateArea(areaId: string, changes: AreaChanges) {
      return api.patch<Area>(`/areas/${areaId}`, compact(changes));
    },

    async deleteArea(areaId) {
      await api.delete<void>(`/areas/${areaId}`);
    },
  };
}
