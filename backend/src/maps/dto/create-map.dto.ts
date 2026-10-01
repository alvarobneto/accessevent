import { IsString, MaxLength } from 'class-validator';

import { IsPresentName } from '../../common/is-present-name.js';

/** Corpo do `POST /events/:eventId/maps`. */
export class CreateMapDto {
  @IsString({ message: 'O nome da navegação deve ser um texto.' })
  @IsPresentName('Informe o nome da navegação.')
  @MaxLength(120, {
    message: 'O nome da navegação deve ter no máximo 120 caracteres.',
  })
  name!: string;
}
