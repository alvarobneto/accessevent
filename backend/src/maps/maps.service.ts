import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { EventEntity } from '../events/event.entity.js';
import type { CreateMapDto } from './dto/create-map.dto.js';
import type { UpdateMapDto } from './dto/update-map.dto.js';
import { MapEntity } from './map.entity.js';
import { toMapResponse, type MapResponse } from './map.response.js';

@Injectable()
export class MapsService {
  constructor(
    @InjectRepository(MapEntity)
    private readonly maps: Repository<MapEntity>,
    @InjectRepository(EventEntity)
    private readonly events: Repository<EventEntity>,
  ) {}

  async findAllByEvent(eventId: string): Promise<MapResponse[]> {
    await this.assertEventExists(eventId);

    const maps = await this.maps.find({
      where: { eventId },
      order: { createdAt: 'ASC' },
    });

    return maps.map(toMapResponse);
  }

  async findOne(id: string): Promise<MapResponse> {
    return toMapResponse(await this.getEntityOrFail(id));
  }

  async create(eventId: string, dto: CreateMapDto): Promise<MapResponse> {
    await this.assertEventExists(eventId);

    const map = this.maps.create({ eventId, name: dto.name.trim() });

    return toMapResponse(await this.maps.save(map));
  }

  async update(id: string, dto: UpdateMapDto): Promise<MapResponse> {
    const map = await this.getEntityOrFail(id);

    if (dto.name !== undefined) {
      map.name = dto.name.trim();
    }

    return toMapResponse(await this.maps.save(map));
  }

  private async getEntityOrFail(id: string): Promise<MapEntity> {
    const map = await this.maps.findOne({ where: { id } });

    if (!map) {
      throw new NotFoundException('Navegação não encontrada.');
    }

    return map;
  }

  private async assertEventExists(eventId: string): Promise<void> {
    const exists = await this.events.exists({ where: { id: eventId } });

    if (!exists) {
      throw new NotFoundException('Evento não encontrado.');
    }
  }
}
