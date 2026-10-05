import type { MigrationInterface, QueryRunner } from 'typeorm';
import { TableColumn, TableIndex } from 'typeorm';

/**
 * Adiciona `events.category`, a classificação do evento que alimenta a seção
 * "descubra por categoria" do app. Nulável para não impactar eventos já
 * cadastrados; os valores possíveis são os de `EVENT_CATEGORIES`.
 */
export class AddEventCategory1730000002000 implements MigrationInterface {
  name = 'AddEventCategory1730000002000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'events',
      new TableColumn({
        name: 'category',
        type: 'character varying(60)',
        isNullable: true,
      }),
    );

    await queryRunner.createIndex(
      'events',
      new TableIndex({
        name: 'events_category_idx',
        columnNames: ['category'],
      }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('events', 'events_category_idx');
    await queryRunner.dropColumn('events', 'category');
  }
}
