import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { MapEntity } from '../maps/map.entity.js';

import type { CreatePoiDto } from './dto/create-poi.dto.js';
import type { UpdatePoiDto } from './dto/update-poi.dto.js';
import { normalizeRect } from './poi-anchor.js';
import { PoiEntity } from './poi.entity.js';
import { toPoiResponse, type PoiResponse } from './poi.response.js';

@Injectable()
export class PoisService {
  constructor(
    @InjectRepository(PoiEntity)
    private readonly pois: Repository<PoiEntity>,
    @InjectRepository(MapEntity)
    private readonly maps: Repository<MapEntity>,
  ) {}

  async findAllByMap(mapId: string): Promise<PoiResponse[]> {
    await this.assertMapExists(mapId);

    const pois = await this.pois.find({
      where: { mapId },
      order: { createdAt: 'ASC' },
    });

    return pois.map(toPoiResponse);
  }

  async findOne(id: string): Promise<PoiResponse> {
    return toPoiResponse(await this.getEntityOrFail(id));
  }

  async create(mapId: string, dto: CreatePoiDto): Promise<PoiResponse> {
    await this.assertMapExists(mapId);

    const poi = this.pois.create({
      mapId,
      // `name` é opcional no DTO e obrigatório na coluna: quem não nomeou o ponto
      // grava o tipo, que é o que a pessoa sabe dizer sobre ele. Ver `CreatePoiDto`.
      name: dto.name?.trim() || dto.type,
      type: dto.type,
      // Quem desenha arrastando solta o dedo em qualquer ordem, então a ordem
      // canônica é garantida aqui e não no cliente. Ver `normalizeRect`.
      rect: normalizeRect(dto.rect),
      anchor: dto.anchor,
      description: dto.description ?? null,
      accessibilityInfo: dto.accessibilityInfo ?? null,
    });

    return toPoiResponse(await this.pois.save(poi));
  }

  async update(id: string, dto: UpdatePoiDto): Promise<PoiResponse> {
    const poi = await this.getEntityOrFail(id);

    if (dto.name !== undefined) {
      poi.name = dto.name.trim();
    }

    if (dto.type !== undefined) {
      poi.type = dto.type;
    }

    // Retângulo e âncora mudam independentes de propósito: redimensionar o quadro
    // não deve reposicionar o ícone, e mover o ícone não deve mexer no quadro.
    // Como a âncora é uma fração, redimensionar é o que faz o ícone acompanhar o
    // retângulo — não é preciso recalcular nada.
    if (dto.rect !== undefined) {
      poi.rect = normalizeRect(dto.rect);
    }

    if (dto.anchor !== undefined) {
      poi.anchor = dto.anchor;
    }

    if (dto.description !== undefined) {
      poi.description = dto.description;
    }

    if (dto.accessibilityInfo !== undefined) {
      poi.accessibilityInfo = dto.accessibilityInfo;
    }

    if (Object.keys(dto).length === 0) {
      return toPoiResponse(poi);
    }

    return toPoiResponse(await this.pois.save(poi));
  }

  async remove(id: string): Promise<void> {
    await this.pois.remove(await this.getEntityOrFail(id));
  }

  private async getEntityOrFail(id: string): Promise<PoiEntity> {
    const poi = await this.pois.findOne({ where: { id } });

    if (!poi) {
      throw new NotFoundException('Ponto de interesse não encontrado.');
    }

    return poi;
  }

  private async assertMapExists(mapId: string): Promise<void> {
    const exists = await this.maps.exists({ where: { id: mapId } });

    if (!exists) {
      throw new NotFoundException('Navegação não encontrada.');
    }
  }
}
