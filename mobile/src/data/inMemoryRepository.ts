import type { AppRepository, EventChanges, NewEvent, NewNavigationMap } from './repository';
import type { Event, NavigationMap } from './types';

/**
 * Implementação em memória do `AppRepository`.
 *
 * O estado vive no escopo do módulo: sobrevive à navegação entre telas e é
 * descartado quando o app fecha. Serve para desenvolver e demonstrar a interface
 * sem a API no ar (`EXPO_PUBLIC_DATA_SOURCE=memory`), e espelha as mesmas
 * regras da implementação HTTP — inclusive os `null` dos campos opcionais.
 */
export function createInMemoryRepository(): AppRepository {
  const events: Event[] = [];
  const navigationMaps: NavigationMap[] = [];
  let sequence = 0;

  const nextId = (prefix: string) => `${prefix}-${++sequence}`;
  const now = () => new Date().toISOString();
  const clean = (value: string | null | undefined) => {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  };

  return {
    async listEvents() {
      return [...events].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    },

    async createEvent({ name, description, address, startDate, endDate }: NewEvent) {
      const timestamp = now();
      const event: Event = {
        id: nextId('evento'),
        name: name.trim(),
        description: clean(description),
        address: clean(address),
        startDate: startDate ?? null,
        endDate: endDate ?? null,
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

      event.updatedAt = now();
      return event;
    },

    async deleteEvent(eventId) {
      const index = events.findIndex((event) => event.id === eventId);

      if (index < 0) {
        throw new Error('Não foi possível apagar: o evento não existe mais.');
      }

      events.splice(index, 1);

      // Espelha o `ON DELETE CASCADE` do banco: as navegações do evento vão junto.
      const kept = navigationMaps.filter((map) => map.eventId !== eventId);
      navigationMaps.length = 0;
      navigationMaps.push(...kept);
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
    },
  };
}
