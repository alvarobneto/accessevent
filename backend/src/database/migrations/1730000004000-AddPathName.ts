import type { MigrationInterface, QueryRunner } from 'typeorm';
import { TableColumn } from 'typeorm';

/**
 * Adiciona `paths.name`, o nome que o organizador dá ao caminho registrado
 * (PRD §23). Nulável porque os caminhos da Sprint 5 já foram gravados sem nome:
 * o `PATCH /paths/:pathId` preenche depois, e a lista do hub precisa continuar
 * mostrando os que não têm.
 */
export class AddPathName1730000004000 implements MigrationInterface {
  name = 'AddPathName1730000004000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'paths',
      new TableColumn({
        name: 'name',
        type: 'character varying(120)',
        isNullable: true,
      }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('paths', 'name');
  }
}
