import { geometryLengthInMeters } from '@/utils/geo';

import type {
  AppRepository,
  EventChanges,
  NewEvent,
  NewNavigationMap,
  NewPath,
} from './repository';
import type { Event, EventCategoryCount, NavigationMap, Path } from './types';

/**
 * Implementação em memória do `AppRepository`.
 *
 * O estado vive no escopo do módulo: sobrevive à navegação entre telas e é
 * descartado quando o app fecha. Serve para desenvolver e demonstrar a interface
 * sem a API no ar (`EXPO_PUBLIC_DATA_SOURCE=memory`), e espelha as mesmas
 * regras da implementação HTTP — inclusive os `null` dos campos opcionais, o
 * cálculo da distância e o `ON DELETE CASCADE` do banco.
 */
export function createInMemoryRepository(): AppRepository {
  const events: Event[] = [];
  const navigationMaps: NavigationMap[] = [];
  const paths: Path[] = [];
  let sequence = 0;

  const nextId = (prefix: string) => `${prefix}-${++sequence}`;
  const now = () => new Date().toISOString();
  const clean = (value: string | null | undefined) => {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  };

  return {
    async listEvents(category) {
      const filtered = category ? events.filter((event) => event.category === category) : events;
      return [...filtered].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    },

    async listEventCategories(): Promise<EventCategoryCount[]> {
      const counts = new Map<string, number>();
      for (const event of events) {
        if (event.category) {
          counts.set(event.category, (counts.get(event.category) ?? 0) + 1);
        }
      }
      return [...counts.entries()]
        .map(([category, eventsCount]) => ({
          category: category as EventCategoryCount['category'],
          eventsCount,
        }))
        .sort((a, b) => b.eventsCount - a.eventsCount);
    },

    async createEvent({ name, description, address, startDate, endDate, category }: NewEvent) {
      const timestamp = now();
      const event: Event = {
        id: nextId('evento'),
        name: name.trim(),
        description: clean(description),
        address: clean(address),
        startDate: startDate ?? null,
        endDate: endDate ?? null,
        category: category ?? null,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      events.push(event);
      return event;
    },

    async getEvent(eventId: string) {
      return events.find((event) => event.id === eventId) ?? null;
    },

    async updateEvent(eventId: string, changes: EventChanges) {
      const event = events.find((item) => item.id === eventId);

      if (!event) {
        throw new Error('Não foi possível salvar: o evento não existe mais.');
      }

      if (changes.name !== undefined) event.name = changes.name.trim();
      if (changes.description !== undefined) {
        event.description = clean(changes.description);
      }
      if (changes.address !== undefined) event.address = clean(changes.address);
      if (changes.startDate !== undefined) event.startDate = changes.startDate;
      if (changes.endDate !== undefined) event.endDate = changes.endDate;
      if (changes.category !== undefined) event.category = changes.category;

      event.updatedAt = now();
      return event;
    },

    async deleteEvent(eventId) {
      const index = events.findIndex((event) => event.id === eventId);

      if (index < 0) {
        throw new Error('Não foi possível apagar: o evento não existe mais.');
      }

      events.splice(index, 1);

      // Espelha o `ON DELETE CASCADE` do banco: as navegações do evento e os
      // caminhos delas vão junto.
      const keptMaps = navigationMaps.filter((map) => map.eventId !== eventId);
      const removedMapIds = new Set(
        navigationMaps.filter((map) => map.eventId === eventId).map((map) => map.id),
      );
      const keptPaths = paths.filter((path) => !removedMapIds.has(path.mapId));
      navigationMaps.length = 0;
      navigationMaps.push(...keptMaps);
      paths.length = 0;
      paths.push(...keptPaths);
    },

    async listNavigationMaps(eventId: string) {
      return navigationMaps.filter((map) => map.eventId === eventId);
    },

    async createNavigationMap({ eventId, name }: NewNavigationMap) {
      if (!events.some((event) => event.id === eventId)) {
        throw new Error('Não foi possível criar a navegação: o evento não existe mais.');
      }

      const timestamp = now();
      const map: NavigationMap = {
        id: nextId('navegacao'),
        eventId,
        name: name.trim(),
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      navigationMaps.push(map);
      return map;
    },

    async getNavigationMap(mapId: string) {
      return navigationMaps.find((map) => map.id === mapId) ?? null;
    },

    async renameNavigationMap(mapId: string, name: string) {
      const map = navigationMaps.find((item) => item.id === mapId);

      if (!map) {
        throw new Error('Não foi possível salvar: a navegação não existe mais.');
      }

      map.name = name.trim();
      map.updatedAt = now();
      return map;
    },

    async deleteNavigationMap(mapId) {
      const index = navigationMaps.findIndex((map) => map.id === mapId);

      if (index < 0) {
        throw new Error('Não foi possível apagar: a navegação não existe mais.');
      }

      navigationMaps.splice(index, 1);

      // Os caminhos da navegação somem com ela, como no `ON DELETE CASCADE`.
      const kept = paths.filter((path) => path.mapId !== mapId);
      paths.length = 0;
      paths.push(...kept);
    },

    async listPaths(mapId) {
      return paths.filter((path) => path.mapId === mapId);
    },

    async createPath({ mapId, geometry }: NewPath) {
      if (!navigationMaps.some((map) => map.id === mapId)) {
        throw new Error('Não foi possível salvar: a navegação não existe mais.');
      }

      // Mesma conta e mesmo arredondamento da API: o repositório em memória existe
      // para a interface ficar utilizável, não para divergir do backend.
      const distance = geometryLengthInMeters(geometry);

      if (distance === 0) {
        throw new Error('O caminho registrado tem comprimento zero. Grave o trajeto de novo.');
      }

      const timestamp = now();
      const path: Path = {
        id: nextId('caminho'),
        mapId,
        geometry,
        distance,
        name: null,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      paths.push(path);
      return path;
    },

    async getPath(pathId) {
      return paths.find((path) => path.id === pathId) ?? null;
    },

    async updatePath(pathId, changes) {
      const path = paths.find((item) => item.id === pathId);

      if (!path) {
        throw new Error('Não foi possível salvar: o caminho não existe mais.');
      }

      // Corpo sem `name` é um PATCH que não muda nada, e a API não grava nesse
      // caso: marcar `updatedAt` aqui faria a tela mostrar o caminho como editado
      // quando ninguém editou.
      if (changes.name !== undefined) {
        path.name = changes.name.trim();
        path.updatedAt = now();
      }

      return path;
    },

    async deletePath(pathId) {
      const index = paths.findIndex((path) => path.id === pathId);

      if (index < 0) {
        throw new Error('Não foi possível apagar: o caminho não existe mais.');
      }

      paths.splice(index, 1);
    },
  };
}
