import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import type { EventCategory } from './event-category.js';

/**
 * Evento do PRD §23. `organizerId` e `imageUrl` ficam de fora até existirem
 * `User` (RF01) e storage.
 */
@Entity({ name: 'events' })
@Index('events_name_idx', ['name'])
@Index('events_category_idx', ['category'])
export class EventEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 120 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  address: string | null;

  // O driver do PostgreSQL já devolve colunas `date` como `YYYY-MM-DD`.
  @Column({ type: 'date', nullable: true })
  startDate: string | null;

  @Column({ type: 'date', nullable: true })
  endDate: string | null;

  /** Categoria do evento, de `EVENT_CATEGORIES`. `NULL` quando não informada. */
  @Column({ type: 'varchar', length: 60, nullable: true })
  category: EventCategory | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
