/**
 * Categorias de evento reconhecidas pela API. A lista é fechada de propósito —
 * "descubra por categoria" só funciona com um vocabulário controlado, e o "outros"
 * garante que nenhum evento fique sem classificação.
 */
export const EVENT_CATEGORIES = [
  'cultura',
  'tecnologia',
  'musica',
  'esportes',
  'gastronomia',
  'educacao',
  'negocios',
  'saude',
  'religiao',
  'outros',
] as const;

export type EventCategory = (typeof EVENT_CATEGORIES)[number];
