import type { AreaEntity, AreaGeometry, AreaType } from './area.entity.js';

export type AreaResponse = {
  id: string;
  mapId: string;
  name: string;
  type: AreaType;
  geometry: AreaGeometry;
  description: string | null;
  createdAt: string;
  updatedAt: string;
};

export function toAreaResponse(area: AreaEntity): AreaResponse {
  return {
    id: area.id,
    mapId: area.mapId,
    name: area.name,
    type: area.type,
    geometry: area.geometry,
    description: area.description,
    createdAt: area.createdAt.toISOString(),
    updatedAt: area.updatedAt.toISOString(),
  };
}
