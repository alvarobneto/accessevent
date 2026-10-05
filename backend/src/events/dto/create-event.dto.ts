import {
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

import { IsPresentName } from '../../common/is-present-name.js';
import { EVENT_CATEGORIES, type EventCategory } from '../event-category.js';

/** Datas de evento são apenas dia, mês e ano, no formato `2026-10-05`. */
export const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const DATE_ONLY_MESSAGE =
  'Informe a data no formato dd/mm/aaaa. Exemplo: 05/10/2026.';

/**
 * Corpo do `POST /events`. Só o nome é obrigatório; o resto é opcional e pode
 * chegar como `null` para limpar o valor. `UpdateEventDto` deriva deste com
 * `PartialType`, então as duas listas de campos não podem divergir.
 */
export class CreateEventDto {
  @IsString({ message: 'O nome do evento deve ser um texto.' })
  @IsPresentName('Informe o nome do evento.')
  @MaxLength(120, {
    message: 'O nome do evento deve ter no máximo 120 caracteres.',
  })
  name!: string;

  @IsOptional()
  @IsString({ message: 'A descrição deve ser um texto.' })
  @MaxLength(2000, {
    message: 'A descrição deve ter no máximo 2000 caracteres.',
  })
  description?: string | null;

  @IsOptional()
  @IsString({ message: 'O endereço deve ser um texto.' })
  @MaxLength(200, { message: 'O endereço deve ter no máximo 200 caracteres.' })
  address?: string | null;

  @IsOptional()
  @Matches(DATE_ONLY_PATTERN, { message: DATE_ONLY_MESSAGE })
  startDate?: string | null;

  @IsOptional()
  @Matches(DATE_ONLY_PATTERN, { message: DATE_ONLY_MESSAGE })
  endDate?: string | null;

  /** Opcional; `null` limpa. Deve ser uma das chaves de `EVENT_CATEGORIES`. */
  @IsOptional()
  @IsIn(EVENT_CATEGORIES, {
    message: 'Informe uma categoria válida para o evento.',
  })
  category?: EventCategory | null;
}
