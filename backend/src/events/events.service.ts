import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import type { CreateEventDto } from './dto/create-event.dto.js';
import type { UpdateEventDto } from './dto/update-event.dto.js';
import { EventEntity } from './event.entity.js';
import { toEventResponse, type EventResponse } from './event.response.js';

/** Campos opcionais aceitam `''` (limpar) ou `null`; gravamos sempre `NULL`. */
function normalizeOptionalText(
  value: string | null | undefined,
): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(EventEntity)
    private readonly events: Repository<EventEntity>,
  ) {}

  async findAll(): Promise<EventResponse[]> {
    const events = await this.events.find({ order: { name: 'ASC' } });
    return events.map(toEventResponse);
  }

  async findOne(id: string): Promise<EventResponse> {
    return toEventResponse(await this.getEntityOrFail(id));
  }

  async create(dto: CreateEventDto): Promise<EventResponse> {
    this.assertDateRange(dto.startDate, dto.endDate);

    const event = this.events.create({
      name: dto.name.trim(),
      description: normalizeOptionalText(dto.description),
      address: normalizeOptionalText(dto.address),
      startDate: dto.startDate ?? null,
      endDate: dto.endDate ?? null,
    });

    return toEventResponse(await this.events.save(event));
  }

  async update(id: string, dto: UpdateEventDto): Promise<EventResponse> {
    const event = await this.getEntityOrFail(id);

    const startDate =
      dto.startDate !== undefined ? dto.startDate : event.startDate;
    const endDate = dto.endDate !== undefined ? dto.endDate : event.endDate;
    this.assertDateRange(startDate, endDate);

    // Campos ausentes no corpo não podem sobrescrever o valor guardado, por isso
    // o patch monta só o que veio de fato.
    if (dto.name !== undefined) event.name = dto.name.trim();
    if (dto.description !== undefined) {
      event.description = normalizeOptionalText(dto.description);
    }
    if (dto.address !== undefined) {
      event.address = normalizeOptionalText(dto.address);
    }
    if (dto.startDate !== undefined) event.startDate = dto.startDate;
    if (dto.endDate !== undefined) event.endDate = dto.endDate;

    return toEventResponse(await this.events.save(event));
  }

  private async getEntityOrFail(id: string): Promise<EventEntity> {
    const event = await this.events.findOne({ where: { id } });

    if (!event) {
      throw new NotFoundException('Evento não encontrado.');
    }

    return event;
  }

  private assertDateRange(
    startDate: string | null | undefined,
    endDate: string | null | undefined,
  ): void {
    if (!startDate || !endDate) {
      return;
    }

    if (endDate < startDate) {
      throw new BadRequestException(
        'A data final do evento não pode ser anterior à data inicial.',
      );
    }
  }
}
