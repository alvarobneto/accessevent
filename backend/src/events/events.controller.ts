import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';

import { ParseUuidPipe } from '../common/parse-uuid-pipe.js';

import { CreateEventDto } from './dto/create-event.dto.js';
import { UpdateEventDto } from './dto/update-event.dto.js';
import type { EventResponse } from './event.response.js';
import { EventsService } from './events.service.js';

@Controller('events')
export class EventsController {
  constructor(private readonly events: EventsService) {}

  @Get()
  async list(): Promise<EventResponse[]> {
    return this.events.findAll();
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
}
