import type { EventCategory } from '@/data/types';

/**
 * Metadados de apresentação das categorias de evento: rótulo em pt-BR e ícone.
 * As chaves são as mesmas aceitas pela API (`EVENT_CATEGORIES` no backend);
 * a lista é fechada para que "descubra por categoria" não fragmente e o
 * "outros" garante que todo evento possa ser classificado.
 */
export const EVENT_CATEGORY_OPTIONS: {
  key: EventCategory;
  label: string;
  icon: string;
}[] = [
  { key: 'cultura', label: 'Cultura', icon: 'star-four-points' },
  { key: 'tecnologia', label: 'Tecnologia', icon: 'zap-outline' },
  { key: 'musica', label: 'Música', icon: 'music-note' },
  { key: 'esportes', label: 'Esportes', icon: 'trophy-outline' },
  { key: 'gastronomia', label: 'Gastronomia', icon: 'silverware-fork-knife' },
  { key: 'educacao', label: 'Educação', icon: 'school-outline' },
  { key: 'negocios', label: 'Negócios', icon: 'briefcase-outline' },
  { key: 'saude', label: 'Saúde', icon: 'heart-plus-outline' },
  { key: 'religiao', label: 'Religião', icon: 'church' },
  { key: 'outros', label: 'Outros', icon: 'dots-horizontal-circle-outline' },
];

const byKey = new Map(EVENT_CATEGORY_OPTIONS.map((item) => [item.key, item]));

export function eventCategoryLabel(category: EventCategory | null): string {
  if (!category) return 'Sem categoria';
  return byKey.get(category)?.label ?? category;
}

export function eventCategoryIcon(category: EventCategory | null): string {
  return (category ? byKey.get(category)?.icon : undefined) ?? 'tag-outline';
}
