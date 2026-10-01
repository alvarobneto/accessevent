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
