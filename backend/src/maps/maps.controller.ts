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
} from '@nestjs/common';

import { ParseUuidPipe } from '../common/parse-uuid-pipe.js';

import { CreateMapDto } from './dto/create-map.dto.js';
import { UpdateMapDto } from './dto/update-map.dto.js';
import type { MapResponse } from './map.response.js';
import { MapsService } from './maps.service.js';

/** Coleção de navegações, aninhada no evento porque é o agregado que as contém. */
@Controller('events/:eventId/maps')
export class EventMapsController {
  constructor(private readonly maps: MapsService) {}

  @Get()
  async list(
    @Param('eventId', ParseUuidPipe()) eventId: string,
  ): Promise<MapResponse[]> {
    return this.maps.findAllByEvent(eventId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Param('eventId', ParseUuidPipe()) eventId: string,
    @Body() dto: CreateMapDto,
  ): Promise<MapResponse> {
    return this.maps.create(eventId, dto);
  }
}

/** Navegação avulsa: buscar pelo id, renomear e apagar. */
@Controller('maps')
export class MapsController {
  constructor(private readonly maps: MapsService) {}

  @Get(':mapId')
  async show(
    @Param('mapId', ParseUuidPipe()) mapId: string,
  ): Promise<MapResponse> {
    return this.maps.findOne(mapId);
  }

  @Patch(':mapId')
  async update(
    @Param('mapId', ParseUuidPipe()) mapId: string,
    @Body() dto: UpdateMapDto,
  ): Promise<MapResponse> {
    return this.maps.update(mapId, dto);
  }

  /** `204` sem corpo, como no apagado de evento. */
  @Delete(':mapId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('mapId', ParseUuidPipe()) mapId: string): Promise<void> {
    await this.maps.remove(mapId);
  }
}
