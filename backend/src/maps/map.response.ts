import type { MapEntity } from './map.entity.js';

/**
 * Formato público da navegação. `eventId` volta na resposta para o app navegar
 * de volta ao evento sem pedir a navegação inteira de novo.
 */
export type MapResponse = {
  id: string;
  eventId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export function toMapResponse(map: MapEntity): MapResponse {
  return {
    id: map.id,
    eventId: map.eventId,
    name: map.name,
    createdAt: map.createdAt.toISOString(),
    updatedAt: map.updatedAt.toISOString(),
  };
}
