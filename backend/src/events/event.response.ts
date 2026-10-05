import type { EventCategory } from './event-category.js';
import type { EventEntity } from './event.entity.js';

/** Categoria com a quantidade de eventos cadastrados nela. */
export type EventCategoryCount = {
  category: EventCategory;
  eventsCount: number;
};

/**
 * Formato público do evento. As chaves seguem o PRD §23 e as datas saem sempre
 * em `YYYY-MM-DD`, então o app nunca precisa interpretar timezone.
 */
export type EventResponse = {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  startDate: string | null;
  endDate: string | null;
  category: EventCategory | null;
  createdAt: string;
  updatedAt: string;
};

export function toEventResponse(event: EventEntity): EventResponse {
  return {
    id: event.id,
    name: event.name,
    description: event.description,
    address: event.address,
    startDate: event.startDate,
    endDate: event.endDate,
    category: event.category ?? null,
    createdAt: event.createdAt.toISOString(),
    updatedAt: event.updatedAt.toISOString(),
  };
}
