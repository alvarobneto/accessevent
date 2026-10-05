import { IsBoundedName } from '../../common/is-bounded-name.js';

/** Corpo do `POST /events/:eventId/maps`. */
export class CreateMapDto {
  @IsBoundedName('da navegação')
  name!: string;
}
