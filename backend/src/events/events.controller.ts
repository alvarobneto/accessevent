import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';

import { ParseUuidPipe } from '../common/parse-uuid-pipe.js';

import { CreateEventDto } from './dto/create-event.dto.js';
import { UpdateEventDto } from './dto/update-event.dto.js';
import type { EventCategoryCount, EventResponse } from './event.response.js';
import { EventsService } from './events.service.js';

@Controller('events')
export class EventsController {
  constructor(private readonly events: EventsService) {}

  @Get()
  async list(@Query('category') category?: string): Promise<EventResponse[]> {
    return this.events.findAll(category);
  }

  /**
   * Categorias com eventos cadastrados. Precisa vir antes de `:eventId` para
   * não ser capturada pelo pipe de UUID.
   */
  @Get('categories')
  async categories(): Promise<EventCategoryCount[]> {
    return this.events.countByCategory();
  }

  @Get(':eventId')
  async show(
    @Param('eventId', ParseUuidPipe()) eventId: string,
  ): Promise<EventResponse> {
    return this.events.findOne(eventId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateEventDto): Promise<EventResponse> {
    return this.events.create(dto);
  }

  @Patch(':eventId')
  async update(
    @Param('eventId', ParseUuidPipe()) eventId: string,
    @Body() dto: UpdateEventDto,
  ): Promise<EventResponse> {
    return this.events.update(eventId, dto);
  }

  /** `204` sem corpo: apagado é sucesso, e não existe evento para devolver. */
  @Delete(':eventId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('eventId', ParseUuidPipe()) eventId: string,
  ): Promise<void> {
    await this.events.remove(eventId);
  }
}
