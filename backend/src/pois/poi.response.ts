import type { CoordinateTuple } from '../common/is-coordinate.js';

import { anchorToPosition, type PoiAnchor, type PoiRect } from './poi-anchor.js';
import type { PoiEntity, PoiType } from './poi.entity.js';

export type PoiResponse = {
  id: string;
  mapId: string;
  name: string;
  type: PoiType;
  /**
   * Retângulo que marca o ponto.
   *
   * Sai da API porque o app precisa redesenhá-lo: o participant vê o retângulo,
   * e quem edita precisa de volta as duas coisas — o quadro e onde o ícone está
   * dentro dele.
   */
  rect: PoiRect;
  /** Onde o ícone está dentro do retângulo, em fração. */
  anchor: PoiAnchor;
  /**
   * Posição absoluta do ícone, **derivada** de `rect` + `anchor`.
   *
   * Ela não é coluna, é conta — `anchorToPosition`, em `poi-anchor.ts`. Sai na
   * resposta mesmo assim porque é o que o resto do app consome: o marcador do
   * mapa, o enquadramento da câmera e a rota da Sprint 16 falam de ponto
   * absoluto, e nenhum deles deveria reconstruir a geometria do retângulo para
   * desenhar um pino. Quem grava manda a âncora; quem lê recebe o ponto.
   */
  position: CoordinateTuple;
  description: string | null;
  accessibilityInfo: string | null;
  createdAt: string;
  updatedAt: string;
};

export function toPoiResponse(poi: PoiEntity): PoiResponse {
  return {
    id: poi.id,
    mapId: poi.mapId,
    name: poi.name,
    type: poi.type,
    rect: poi.rect,
    anchor: poi.anchor,
    position: anchorToPosition(poi.rect, poi.anchor),
    description: poi.description ?? null,
    accessibilityInfo: poi.accessibilityInfo ?? null,
    createdAt: poi.createdAt.toISOString(),
    updatedAt: poi.updatedAt.toISOString(),
  };
}
