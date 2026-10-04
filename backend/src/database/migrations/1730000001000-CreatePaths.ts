import type { MigrationInterface, QueryRunner } from 'typeorm';
import { Table, TableIndex } from 'typeorm';

/**
 * `paths` (PRD §23), a entidade que nasce na Sprint 5 com o que a gravação da
 * Sprint 4 produz.
 *
 * `startNodeId`/`endNodeId` e os atributos de acessibilidade **não** entram aqui:
 * os nós só existem a partir da Sprint 7 e os atributos a partir da Sprint 9, e
 * cada um chega na sua migração. O `down` só remove a própria tabela.
 */
export class CreatePaths1730000001000 implements MigrationInterface {
  name = 'CreatePaths1730000001000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'paths',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          { name: 'mapId', type: 'uuid', isNullable: false },
          { name: 'geometry', type: 'jsonb', isNullable: false },
          { name: 'distance', type: 'real', isNullable: false },
          {
            name: 'createdAt',
            type: 'TIMESTAMP WITH TIME ZONE',
            isNullable: false,
            default: 'now()',
          },
          {
            name: 'updatedAt',
            type: 'TIMESTAMP WITH TIME ZONE',
            isNullable: false,
            default: 'now()',
          },
        ],
        foreignKeys: [
          {
            name: 'paths_map_id_fk',
            columnNames: ['mapId'],
            referencedTableName: 'maps',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
        indices: [
          new TableIndex({ name: 'paths_map_id_idx', columnNames: ['mapId'] }),
        ],
      }),
      true,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('paths', true);
  }
}
