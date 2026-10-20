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

import { AreaResponse } from './area.response.js';
import { AreasService } from './areas.service.js';
import { CreateAreaDto } from './dto/create-area.dto.js';
import { UpdateAreaDto } from './dto/update-area.dto.js';

@Controller()
export class AreasController {
  constructor(private readonly areas: AreasService) {}

  @Get('maps/:mapId/areas')
  findAllByMap(@Param('mapId', ParseUuidPipe()) mapId: string): Promise<AreaResponse[]> {
    return this.areas.findAllByMap(mapId);
  }

  @Post('maps/:mapId/areas')
  @HttpCode(HttpStatus.CREATED)
  create(
    @Param('mapId', ParseUuidPipe()) mapId: string,
    @Body() dto: CreateAreaDto,
  ): Promise<AreaResponse> {
    return this.areas.create(mapId, dto);
  }

  @Get('areas/:id')
  findOne(@Param('id', ParseUuidPipe()) id: string): Promise<AreaResponse> {
    return this.areas.findOne(id);
  }

  @Patch('areas/:id')
  update(
    @Param('id', ParseUuidPipe()) id: string,
    @Body() dto: UpdateAreaDto,
  ): Promise<AreaResponse> {
    return this.areas.update(id, dto);
  }

  @Delete('areas/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUuidPipe()) id: string): Promise<void> {
    return this.areas.remove(id);
  }
}
