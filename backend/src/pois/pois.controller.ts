import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
} from '@nestjs/common';

import { ParseUuidPipe } from '../common/parse-uuid-pipe.js';

import { CreatePoiDto } from './dto/create-poi.dto.js';
import { UpdatePoiDto } from './dto/update-poi.dto.js';
import { PoisService } from './pois.service.js';
import { PoiResponse } from './poi.response.js';

@Controller()
export class PoisController {
  constructor(private readonly pois: PoisService) {}

  @Get('maps/:mapId/pois')
  findAllByMap(
    @Param('mapId', ParseUuidPipe()) mapId: string,
  ): Promise<PoiResponse[]> {
    return this.pois.findAllByMap(mapId);
  }

  @Get('pois/:id')
  findOne(@Param('id', ParseUuidPipe()) id: string): Promise<PoiResponse> {
    return this.pois.findOne(id);
  }

  @Post('maps/:mapId/pois')
  create(
    @Param('mapId', ParseUuidPipe()) mapId: string,
    @Body() dto: CreatePoiDto,
  ): Promise<PoiResponse> {
    return this.pois.create(mapId, dto);
  }

  @Patch('pois/:id')
  update(
    @Param('id', ParseUuidPipe()) id: string,
    @Body() dto: UpdatePoiDto,
  ): Promise<PoiResponse> {
    return this.pois.update(id, dto);
  }

  @Delete('pois/:id')
  @HttpCode(204)
  remove(@Param('id', ParseUuidPipe()) id: string): Promise<void> {
    return this.pois.remove(id);
  }
}
