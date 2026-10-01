import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { EventEntity } from '../events/event.entity.js';

/**
 * Navegação do PRD §23: um mapa do evento, usado como grafo nas Sprints 6 a 12.
 * O `state` (DRAFT/PUBLISHED/ARCHIVED) chega na Sprint 19, junto da publicação.
 */
@Entity({ name: 'maps' })
@Index('maps_event_id_idx', ['eventId'])
export class MapEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  eventId: string;

  @Column({ type: 'varchar', length: 120 })
  name: string;

  /**
   * Opcional de propósito: as consultas do módulo não usam `relations`, então
   * `event` só existe quando alguém pede o eager. O vínculo que o app usa é
   * `eventId`.
   */
  @ManyToOne(() => EventEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'eventId', foreignKeyConstraintName: 'maps_event_id_fk' })
  event?: EventEntity;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
