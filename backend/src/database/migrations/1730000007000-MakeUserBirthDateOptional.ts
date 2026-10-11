import type { MigrationInterface, QueryRunner } from 'typeorm';
import { TableColumn } from 'typeorm';

export class MakeUserBirthDateOptional1730000007000 implements MigrationInterface {
  name = 'MakeUserBirthDateOptional1730000007000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.changeColumn(
      'users',
      'birthDate',
      new TableColumn({
        name: 'birthDate',
        type: 'date',
        isNullable: true,
      }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.changeColumn(
      'users',
      'birthDate',
      new TableColumn({
        name: 'birthDate',
        type: 'date',
        isNullable: false,
      }),
    );
  }
}
