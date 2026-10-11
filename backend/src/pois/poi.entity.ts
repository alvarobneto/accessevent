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

import type { PoiAnchor, PoiRect } from './poi-anchor.js';

/**
 * Ponto de interesse (PRD §23).
 *
 * Nó do mapa: POIs são nós do grafo com caminhos como arestas (PRD §8.2).
 * Os tipos vêm do conjunto definido no Sprint 7.
 */
export const PoiTypeValues = [
  'Entrada',
  'Saída',
  'Banheiro',
  'Banheiro acessível',
  'Elevador',
  'Escada',
  'Rampa',
  'Auditório',
  'Sala',
  'Alimentação',
  'Atendimento',
  'Posto médico',
  'Outro',
] as const;

export type PoiType = (typeof PoiTypeValues)[number];

@Entity({ name: 'points_of_interest' })
@Index('pois_map_id_idx', ['mapId'])
export class PoiEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  mapId: string;

  @ManyToOne(() => MapEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'mapId', foreignKeyConstraintName: 'pois_map_id_fk' })
  map?: MapEntity;

  @Column({ type: 'varchar', length: 120 })
  name: string;

  @Column({ type: 'varchar', length: 32 })
  type: PoiType;

  /**
   * Retângulo que marca o ponto, em dois cantos opostos em lat/lng.
   *
   * É o que o organizador desenha no mapa, e é **obrigatório**: o retângulo é a
   * marcação visual do ponto de interesse, e um ponto sem marcação não é o que
   * o produto pede. Ver `poi-anchor.ts` para por que dois cantos e não quatro.
   */
  @Column({ type: 'jsonb' })
  rect: PoiRect;

  /**
   * Onde o ícone está dentro do retângulo, em fração.
   *
   * E **derivada** no sentido inverso: a posição absoluta do ícone é
   * `anchorToPosition(rect, anchor)`, e não uma coluna. Ver `PoiResponse.position`.
   */
  @Column({ type: 'jsonb' })
  anchor: PoiAnchor;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'text', nullable: true })
  accessibilityInfo: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
