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

import type { CoordinateTuple } from '../common/is-coordinate.js';

import { MapEntity } from '../maps/map.entity.js';

/**
 * Caminho do PRD §23: um trecho navegável desenhado pelo organizador.
 *
 * Nasce com o que a gravação da Sprint 4 produz — a geometria e a distância — e
 * ganha o resto por etapas, cada uma com sua migração:
 *
 * - `name` na Sprint 6, quando o organizador passa a nomear o caminho em vez de
 *   reconhecê-lo só por distância e data. Nulável para os caminhos que a
 *   gravação já deixou sem nome.
 *
 * - `startNodeId`/`endNodeId` na Sprint 7, quando existirem os pontos que são as
 *   pontas do caminho (PRD §8.2). Antes disso a coluna não pode existir: uma
 *   chave estrangeira para um nó que o app ainda não cria seria um `404` no meio
 *   do fluxo de gravação.
 * - `accessibilityStatus`, `width`, `hasStairs`, `hasRamp`, `floorType` e
 *   `notes` na Sprint 9, que é a fase de acessibilidade.
 *
 * Criar as colunas todas agora seria um schema que mente sobre o que existe: o
 * app não tem tela para nenhuma delas, e o `POST /paths` aceitaria um atributo
 * de acessibilidade que ninguém preencheu.
 */
@Entity({ name: 'paths' })
@Index('paths_map_id_idx', ['mapId'])
export class PathEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  mapId: string;

  /** Opcional pelos mesmos motivos de `MapEntity.event`. */
  @ManyToOne(() => MapEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'mapId', foreignKeyConstraintName: 'paths_map_id_fk' })
  map?: MapEntity;

  /**
   * Trajeto em graus decimais, do início ao fim, em JSON puro (PRD §25).
   *
   * Lista de pares `[latitude, longitude]` e não `LINESTRING` do PostGIS porque o
   * MVP guarda coordenada como JSON: o app, a API e o banco falam o mesmo idioma,
   * então não existe conversion layer para manter em três lugares.
   */
  @Column({ type: 'jsonb' })
  geometry: CoordinateTuple[];

  /**
   * Distância estimada do caminho, em metros (PRD §8.2).
   *
   * Coluna e não getter porque o cálculo de rota da Sprint 16 vai ordenar e
   * somar distâncias, e fazer haversine em JSON a cada comparação é o tipo de
   * trabalho que o banco faz melhor. O valor é derivado da geometria pelo
   * servidor no momento da gravação, nunca aceito do app.
   */
  @Column({ type: 'real' })
  distance: number;

  /**
   * Nome que o organizador deu ao caminho, ou `null` quando ele ainda não
   * nomeou (Sprint 6).
   *
   * Nulável e não obrigatório na gravação: quem percorre o local primeiro grava
   * o trajeto e depois o nomeia, e obrigar o nome no `POST` faria a tela de
   * gravação da Sprint 4 pedir um dado que ela não tem onde pedir.
   *
   * Não é o que torna o caminho único: `id` é. Dois caminhos podem chamar
   * "Corredor central" — o que os distingue é o trajeto.
   */
  @Column({ type: 'varchar', length: 120, nullable: true })
  name: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
