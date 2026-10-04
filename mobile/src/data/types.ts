import type { MapGeometry } from '@/types/map';

/**
 * Tipos do domínio. Os nomes seguem o modelo do PRD §23, em inglês, e a
 * nomenclatura de produto em português fica na interface.
 *
 * Os campos opcionais são `null` (e não string vazia) porque é o que a API
 * devolve; a API normaliza string vazia em `NULL` ao gravar.
 */
export type Event = {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  /** `YYYY-MM-DD`, ou `null` quando o evento não tem data. */
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
};

/** Navegação: um mapa do evento. É a entidade `Map` do PRD §23 */
export type NavigationMap = {
  id: string;
  eventId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

/**
 * Caminho: um trecho desenhado pelo organizador. É a entidade `Path` do PRD §23,
 * e nasce na Sprint 5 só com o que a gravação produz — geometria e distância.
 *
 * `distance` **não volta na escrita**: o servidor calcula a partir da geometria e
 * devolve o valor, então o número que a tela mostra durante a gravação e o que
 * fica gravado vêm da mesma conta. `startNodeId`/`endNodeId` e os atributos de
 * acessibilidade chegam nas Sprints 7 e 9, cada um com seu campo.
 */
export type Path = {
  id: string;
  mapId: string;
  geometry: MapGeometry;
  /** Distância estimada, em metros. */
  distance: number;
  createdAt: string;
  updatedAt: string;
};
