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

import { MapEntity } from '../maps/map.entity.js';

import type { CoordinateTuple } from '../common/is-coordinate.js';

export const AreaTypeValues = [
  'alimentacao',
  'salao',
  'exposicao',
  'foyer',
  'auditorio',
  'outro',
] as const;

export type AreaType = (typeof AreaTypeValues)[number];
export type AreaGeometry = readonly CoordinateTuple[];

/** Região aberta do mapa, representada por um anel geográfico (PRD §8.3). */
@Entity({ name: 'areas' })
@Index('areas_map_id_idx', ['mapId'])
export class AreaEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  mapId: string;

  @ManyToOne(() => MapEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'mapId', foreignKeyConstraintName: 'areas_map_id_fk' })
  map?: MapEntity;

  @Column({ type: 'varchar', length: 120 })
  name: string;

  @Column({ type: 'varchar', length: 32 })
  type: AreaType;

  @Column({ type: 'jsonb' })
  geometry: AreaGeometry;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
