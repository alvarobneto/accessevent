import { PartialType } from '@nestjs/mapped-types';

import { CreateEventDto } from './create-event.dto.js';

/** Corpo do `PATCH /events/:id` — todos os campos viram opcionais. */
export class UpdateEventDto extends PartialType(CreateEventDto) {}
