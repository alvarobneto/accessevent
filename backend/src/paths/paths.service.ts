import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { MapEntity } from '../maps/map.entity.js';

import type { CreatePathDto } from './dto/create-path.dto.js';
import { PathEntity } from './path.entity.js';
import { pathLengthInMeters } from './path-distance.js';
import { toPathResponse, type PathResponse } from './path.response.js';

@Injectable()
export class PathsService {
  constructor(
    @InjectRepository(PathEntity)
    private readonly paths: Repository<PathEntity>,
    @InjectRepository(MapEntity)
    private readonly maps: Repository<MapEntity>,
  ) {}

  /** Caminhos da navegação, do mais antigo para o mais novo. */
  async findAllByMap(mapId: string): Promise<PathResponse[]> {
    await this.assertMapExists(mapId);

    const paths = await this.paths.find({
      where: { mapId },
      order: { createdAt: 'ASC' },
    });

    return paths.map(toPathResponse);
  }

  async findOne(id: string): Promise<PathResponse> {
    return toPathResponse(await this.getEntityOrFail(id));
  }

  async create(mapId: string, dto: CreatePathDto): Promise<PathResponse> {
    await this.assertMapExists(mapId);

    const distance = pathLengthInMeters(dto.geometry);

    // Geometria com todos os pontos iguais passa na validação de formato — é uma
    // lista de coordenadas válidas — mas não é um caminho. Rejeitar aqui evita a
    // linha inútil que a Sprint 16 encontraria como aresta de comprimento zero,
    // quando já não dá para saber de onde ela veio.
    if (distance === 0) {
      throw new BadRequestException(
        'O caminho registrado tem comprimento zero. Grave o trajeto de novo.',
      );
    }

    const path = this.paths.create({ mapId, geometry: dto.geometry, distance });

    return toPathResponse(await this.paths.save(path));
  }

  /** `204` sem corpo, como no apagado de navegação. */
  async remove(id: string): Promise<void> {
    await this.paths.remove(await this.getEntityOrFail(id));
  }

  private async getEntityOrFail(id: string): Promise<PathEntity> {
    const path = await this.paths.findOne({ where: { id } });

    if (!path) {
      throw new NotFoundException('Caminho não encontrado.');
    }

    return path;
  }

  private async assertMapExists(mapId: string): Promise<void> {
    const exists = await this.maps.exists({ where: { id: mapId } });

    if (!exists) {
      throw new NotFoundException('Navegação não encontrada.');
    }
  }
}
