import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import type { CreateEventDto } from './dto/create-event.dto.js';
import type { UpdateEventDto } from './dto/update-event.dto.js';
import type { EventCategory } from './event-category.js';
import { EventEntity } from './event.entity.js';
import {
  toEventResponse,
  type EventCategoryCount,
  type EventResponse,
} from './event.response.js';

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

  async findAll(category?: string): Promise<EventResponse[]> {
    const where =
      category !== undefined ? { category: category as EventCategory } : {};
    const events = await this.events.find({ where, order: { name: 'ASC' } });
    return events.map(toEventResponse);
  }

  /**
   * Categorias que têm ao menos um evento, com a contagem. Usadas pela tela
   * "descubra por categoria": uma categoria sem evento não aparece.
   */
  async countByCategory(): Promise<EventCategoryCount[]> {
    const rows = await this.events.find({
      select: { category: true },
      order: { category: 'ASC' },
    });

    const counts = new Map<EventCategory, number>();
    for (const row of rows) {
      if (row.category) {
        counts.set(row.category, (counts.get(row.category) ?? 0) + 1);
      }
    }

    return [...counts.entries()]
      .map(([category, eventsCount]) => ({ category, eventsCount }))
      .sort((a, b) => b.eventsCount - a.eventsCount);
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
      category: dto.category ?? null,
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
    if (dto.category !== undefined) event.category = dto.category;

    return toEventResponse(await this.events.save(event));
  }

  /**
   * Apaga o evento. As navegações dele vão junto pela chave estrangeira com
   * `ON DELETE CASCADE`, então não há nada para apagar em cascata aqui.
   */
  async remove(id: string): Promise<void> {
    await this.events.remove(await this.getEntityOrFail(id));
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
