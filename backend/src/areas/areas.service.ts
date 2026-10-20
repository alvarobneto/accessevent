import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { MapEntity } from '../maps/map.entity.js';

import type { CreateAreaDto } from './dto/create-area.dto.js';
import type { UpdateAreaDto } from './dto/update-area.dto.js';
import { AreaEntity } from './area.entity.js';
import { toAreaResponse, type AreaResponse } from './area.response.js';

@Injectable()
export class AreasService {
  constructor(
    @InjectRepository(AreaEntity) private readonly areas: Repository<AreaEntity>,
    @InjectRepository(MapEntity) private readonly maps: Repository<MapEntity>,
  ) {}

  async findAllByMap(mapId: string): Promise<AreaResponse[]> {
    await this.assertMapExists(mapId);
    const areas = await this.areas.find({ where: { mapId }, order: { createdAt: 'ASC' } });
    return areas.map(toAreaResponse);
  }

  async findOne(id: string): Promise<AreaResponse> {
    return toAreaResponse(await this.getEntityOrFail(id));
  }

  async create(mapId: string, dto: CreateAreaDto): Promise<AreaResponse> {
    await this.assertMapExists(mapId);
    const area = this.areas.create({
      mapId,
      name: dto.name.trim(),
      type: dto.type,
      geometry: dto.geometry,
      description: dto.description?.trim() || null,
    });
    return toAreaResponse(await this.areas.save(area));
  }

  async update(id: string, dto: UpdateAreaDto): Promise<AreaResponse> {
    const area = await this.getEntityOrFail(id);
    if (dto.name !== undefined) area.name = dto.name.trim();
    if (dto.type !== undefined) area.type = dto.type;
    if (dto.geometry !== undefined) area.geometry = dto.geometry;
    if (dto.description !== undefined) area.description = dto.description?.trim() || null;

    if (
      dto.name === undefined &&
      dto.type === undefined &&
      dto.geometry === undefined &&
      dto.description === undefined
    ) {
      return toAreaResponse(area);
    }

    return toAreaResponse(await this.areas.save(area));
  }

  async remove(id: string): Promise<void> {
    await this.areas.remove(await this.getEntityOrFail(id));
  }

  private async getEntityOrFail(id: string): Promise<AreaEntity> {
    const area = await this.areas.findOne({ where: { id } });
    if (!area) throw new NotFoundException('Área não encontrada.');
    return area;
  }

  private async assertMapExists(mapId: string): Promise<void> {
    if (!(await this.maps.exists({ where: { id: mapId } }))) {
      throw new NotFoundException('Navegação não encontrada.');
    }
  }
}
