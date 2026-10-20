import { geometryLengthInMeters } from '@/utils/geo';
import { anchorToPosition, normalizeRect } from '@/utils/poiAnchor';

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
  const pois: PointOfInterest[] = [];
  const areas: Area[] = [];
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
      const keptPois = pois.filter((poi) => !removedMapIds.has(poi.mapId));
      navigationMaps.length = 0;
      navigationMaps.push(...keptMaps);
      paths.length = 0;
      paths.push(...keptPaths);
      pois.length = 0;
      pois.push(...keptPois);
      const keptAreas = areas.filter((area) => !removedMapIds.has(area.mapId));
      areas.length = 0;
      areas.push(...keptAreas);
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

      // Os caminhos e os pontos da navegação somem com ela, como no
      // `ON DELETE CASCADE` do Postgres.
      const keptPaths = paths.filter((path) => path.mapId !== mapId);
      paths.length = 0;
      paths.push(...keptPaths);

      const keptPois = pois.filter((poi) => poi.mapId !== mapId);
      pois.length = 0;
      pois.push(...keptPois);
      const keptAreas = areas.filter((area) => area.mapId !== mapId);
      areas.length = 0;
      areas.push(...keptAreas);
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

    async replacePathGeometry(pathId, geometry) {
      const path = paths.find((item) => item.id === pathId);

      if (!path) {
        throw new Error('Não foi possível salvar: o caminho não existe mais.');
      }

      const distance = geometryLengthInMeters(geometry);

      if (distance === 0) {
        throw new Error('O trajeto ajustado tem comprimento zero. Desfaça os ajustes.');
      }

      path.geometry = geometry;
      path.distance = distance;
      path.updatedAt = now();
      return path;
    },

    async deletePath(pathId) {
      const index = paths.findIndex((path) => path.id === pathId);

      if (index < 0) {
        throw new Error('Não foi possível apagar: o caminho não existe mais.');
      }

      paths.splice(index, 1);
    },

    async listPois(mapId) {
      return pois
        .filter((p) => p.mapId === mapId)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    },

    async createPoi(input) {
      const timestamp = now();
      const rect = normalizeRect(input.rect);
      // `position` é derivado, igual na API: a âncora no retângulo manda. Ver
      // `utils/poiAnchor.ts`.
      const poi: PointOfInterest = {
        id: nextId('poi'),
        mapId: input.mapId,
        name: input.name.trim(),
        type: input.type,
        rect,
        anchor: input.anchor,
        position: anchorToPosition(rect, input.anchor),
        description: clean(input.description),
        accessibilityInfo: clean(input.accessibilityInfo),
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      pois.push(poi);
      return poi;
    },

    async getPoi(poiId) {
      return pois.find((p) => p.id === poiId) ?? null;
    },

    async updatePoi(poiId, changes) {
      const poi = pois.find((p) => p.id === poiId);
      if (!poi) {
        throw new Error('Não foi possível salvar: o ponto não existe mais.');
      }
      if (changes.name !== undefined) poi.name = changes.name.trim();
      if (changes.type !== undefined) poi.type = changes.type;
      // Retângulo e âncora mudam independentes: redimensionar o quadro reposiciona
      // o ícone porque a mesma âncora vale no quadro novo.
      if (changes.rect !== undefined) poi.rect = normalizeRect(changes.rect);
      if (changes.anchor !== undefined) poi.anchor = changes.anchor;
      if (changes.rect !== undefined || changes.anchor !== undefined) {
        poi.position = anchorToPosition(poi.rect, poi.anchor);
      }
      if (changes.description !== undefined) poi.description = clean(changes.description);
      if (changes.accessibilityInfo !== undefined)
        poi.accessibilityInfo = clean(changes.accessibilityInfo);
      poi.updatedAt = now();
      return poi;
    },

    async deletePoi(poiId) {
      const idx = pois.findIndex((p) => p.id === poiId);
      if (idx >= 0) pois.splice(idx, 1);
    },

    async listAreas(mapId) {
      return areas
        .filter((area) => area.mapId === mapId)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    },

    async createArea(input: NewArea) {
      if (!navigationMaps.some((map) => map.id === input.mapId)) {
        throw new Error('Não foi possível criar a área: a navegação não existe mais.');
      }
      const timestamp = now();
      const area: Area = {
        id: nextId('area'),
        mapId: input.mapId,
        name: input.name.trim(),
        type: input.type,
        geometry: input.geometry,
        description: clean(input.description),
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      areas.push(area);
      return area;
    },

    async updateArea(areaId: string, changes: AreaChanges) {
      const area = areas.find((item) => item.id === areaId);
      if (!area) throw new Error('Não foi possível salvar: a área não existe mais.');
      if (changes.name !== undefined) area.name = changes.name.trim();
      if (changes.type !== undefined) area.type = changes.type;
      if (changes.geometry !== undefined) area.geometry = changes.geometry;
      if (changes.description !== undefined) area.description = clean(changes.description);
      area.updatedAt = now();
      return area;
    },

    async deleteArea(areaId) {
      const index = areas.findIndex((area) => area.id === areaId);
      if (index < 0) throw new Error('Não foi possível apagar: a área não existe mais.');
      areas.splice(index, 1);
    },
  };
}
