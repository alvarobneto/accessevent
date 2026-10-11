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

import { CreatePathDto } from './dto/create-path.dto.js';
import { UpdatePathDto } from './dto/update-path.dto.js';
import { UpdatePathGeometryDto } from './dto/update-path-geometry.dto.js';
import type { PathResponse } from './path.response.js';
import { PathsService } from './paths.service.js';

/**
 * Coleção de caminhos, aninhada na navegação porque é o agregado que os contém.
 *
 * O mesmo desenho de `EventMapsController`: o `mapId` vem da rota e nunca do
 * corpo, então um caminho não pode acabar gravado em outra navegação por engano.
 */
@Controller('maps/:mapId/paths')
export class MapPathsController {
  constructor(private readonly paths: PathsService) {}

  @Get()
  async list(
    @Param('mapId', ParseUuidPipe()) mapId: string,
  ): Promise<PathResponse[]> {
    return this.paths.findAllByMap(mapId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Param('mapId', ParseUuidPipe()) mapId: string,
    @Body() dto: CreatePathDto,
  ): Promise<PathResponse> {
    return this.paths.create(mapId, dto);
  }
}

/** Caminho avulso: buscar pelo id, renomear e apagar. */
@Controller('paths')
export class PathsController {
  constructor(private readonly paths: PathsService) {}

  @Get(':pathId')
  async show(
    @Param('pathId', ParseUuidPipe()) pathId: string,
  ): Promise<PathResponse> {
    return this.paths.findOne(pathId);
  }

  /** Renomear o caminho, o que a Sprint 6 acrescenta ao editor do organizador. */
  @Patch(':pathId')
  async update(
    @Param('pathId', ParseUuidPipe()) pathId: string,
    @Body() dto: UpdatePathDto,
  ): Promise<PathResponse> {
    return this.paths.update(pathId, dto);
  }

  /**
   * Substitui a geometria pelo trajeto ajustado no mapa.
   *
   * Rota própria em vez de um campo no `PATCH :pathId`: o renomear não pode
   * reescrever o trajeto por engano, e a geometria nova pede validação e cálculo
   * de distância distintos dos do nome.
   */
  @Patch(':pathId/geometry')
  async replaceGeometry(
    @Param('pathId', ParseUuidPipe()) pathId: string,
    @Body() dto: UpdatePathGeometryDto,
  ): Promise<PathResponse> {
    return this.paths.replaceGeometry(pathId, dto.geometry);
  }

  @Delete(':pathId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('pathId', ParseUuidPipe()) pathId: string,
  ): Promise<void> {
    await this.paths.remove(pathId);
  }
}
