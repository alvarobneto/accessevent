import type { CoordinateTuple } from '../common/is-coordinate.js';

import type { PathEntity } from './path.entity.js';

/**
 * Formato público do caminho (PRD §23).
 *
 * `mapId` volta na resposta para o app não precisar lembrar com qual navegação
 * está falando, e `distance` é o que a tela mostra ao lado da data de gravação.
 */
export type PathResponse = {
  id: string;
  mapId: string;
  geometry: CoordinateTuple[];
  distance: number;
  createdAt: string;
  updatedAt: string;
};

export function toPathResponse(path: PathEntity): PathResponse {
  return {
    id: path.id,
    mapId: path.mapId,
    geometry: path.geometry,
    distance: path.distance,
    createdAt: path.createdAt.toISOString(),
    updatedAt: path.updatedAt.toISOString(),
  };
}
