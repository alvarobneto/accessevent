import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { MapEntity } from '../maps/map.entity.js';

import type { CreatePathDto } from './dto/create-path.dto.js';
import type { UpdatePathDto } from './dto/update-path.dto.js';
import type { UpdatePathGeometryDto } from './dto/update-path-geometry.dto.js';
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

  /**
   * Renomeia o caminho. Só o nome muda: o trajeto gravado e a distância não são
   * reescritos aqui, e a distância continua sendo a conta da geometria que o
   * servidor fez na gravação.
   *
   * Um corpo sem `name` não grava. O `PATCH` aceitaria `{}` — todos os campos do
   * DTO são opcionais — e salvar assim marcaria `updatedAt` sem ter mudado
   * nada, então a tela mostraria o caminho como editado quando ninguém editou.
   */
  async update(id: string, dto: UpdatePathDto): Promise<PathResponse> {
    const path = await this.getEntityOrFail(id);

    if (dto.name === undefined) {
      return toPathResponse(path);
    }

    path.name = dto.name.trim();

    return toPathResponse(await this.paths.save(path));
  }

  /**
   * Substitui a geometria do caminho pelo trajeto ajustado no mapa.
   *
   * É o salvamento do ajuste manual (o organizador arrastando pontos e trechos
   * para corrigir a imprecisão do GPS): a distância é recalculada aqui pela
   * mesma conta da gravação, porque o cliente nunca envia `distance` — mandar o
   * valor calculado no app aceitaria dois números para a mesma medida.
   *
   * Comprimento zero é a mesma recusa do `create`, com frase própria: o caminho
   * gravado existia, então "grave de novo" não é o conselho certo para quem está
   * ajustando — o certo é desfazer o ajuste.
   *
   * A quantidade de vértices também é invariável: cada posição na lista identifica
   * um ponto persistente do rastro, inclusive nas curvas. Ajustar só troca as
   * coordenadas por índice; não cria, remove ou reordena pontos.
   */
  async replaceGeometry(
    id: string,
    geometry: UpdatePathGeometryDto['geometry'],
  ): Promise<PathResponse> {
    const path = await this.getEntityOrFail(id);

    if (geometry.length !== path.geometry.length) {
      throw new BadRequestException(
        'O ajuste não pode adicionar ou remover pontos do trajeto.',
      );
    }

    const distance = pathLengthInMeters(geometry);

    if (distance === 0) {
      throw new BadRequestException(
        'O trajeto ajustado tem comprimento zero. Desfaça os ajustes.',
      );
    }

    path.geometry = geometry;
    path.distance = distance;

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
