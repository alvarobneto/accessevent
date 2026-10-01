import { useInMemoryData } from '@/config/env';

import { createHttpRepository } from './httpRepository';
import { createInMemoryRepository } from './inMemoryRepository';
import type { AppRepository } from './repository';

/**
 * Repositório usado pelo aplicativo.
 *
 * A API REST do backend é o padrão. `EXPO_PUBLIC_DATA_SOURCE=memory` troca para
 * a implementação em memória, que deixa a interface utilizável com o backend
 * desligado — as telas não percebem a troca porque ambas implementam
 * `AppRepository`.
 */
export const repository: AppRepository = useInMemoryData
  ? createInMemoryRepository()
  : createHttpRepository();

export type { AppRepository, EventChanges, NewEvent, NewNavigationMap } from './repository';
export type { Event, NavigationMap } from './types';
