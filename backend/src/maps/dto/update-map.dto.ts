import { PartialType } from '@nestjs/mapped-types';

import { CreateMapDto } from './create-map.dto.js';

/** Corpo do `PATCH /maps/:mapId` — só o nome muda por aqui. */
export class UpdateMapDto extends PartialType(CreateMapDto) {}
