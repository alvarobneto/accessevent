import type { MigrationInterface, QueryRunner } from 'typeorm';
import { Table, TableIndex } from 'typeorm';

export class CreateUsers1730000003000 implements MigrationInterface {
  name = 'CreateUsers1730000003000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'users',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          {
            name: 'email',
            type: 'character varying(255)',
            isUnique: true,
            isNullable: false,
          },
          {
            name: 'firstName',
            type: 'character varying(100)',
            isNullable: false,
          },
          {
            name: 'lastName',
            type: 'character varying(100)',
            isNullable: false,
          },
          {
            name: 'birthDate',
            type: 'date',
            isNullable: false,
          },
          {
            name: 'password',
            type: 'character varying(255)',
            isNullable: false,
          },
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
        indices: [
          new TableIndex({ name: 'users_email_idx', columnNames: ['email'], isUnique: true }),
        ],
      }),
      true,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('users', true);
  }
}