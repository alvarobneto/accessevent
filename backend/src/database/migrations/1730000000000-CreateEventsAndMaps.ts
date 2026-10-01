import type { MigrationInterface, QueryRunner } from 'typeorm';
import { Table, TableIndex } from 'typeorm';

/**
 * Schema inicial: `events` e `maps` (PRD §23).
 * `organizerId` chega junto com `User` (RF01) e o `state` do mapa na Sprint 19.
 */
export class CreateEventsAndMaps1730000000000 implements MigrationInterface {
  name = 'CreateEventsAndMaps1730000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'events',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          { name: 'name', type: 'character varying(120)', isNullable: false },
          { name: 'description', type: 'text', isNullable: true },
          { name: 'address', type: 'character varying(200)', isNullable: true },
          { name: 'startDate', type: 'date', isNullable: true },
          { name: 'endDate', type: 'date', isNullable: true },
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
          new TableIndex({ name: 'events_name_idx', columnNames: ['name'] }),
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'maps',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          { name: 'eventId', type: 'uuid', isNullable: false },
          { name: 'name', type: 'character varying(120)', isNullable: false },
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
            name: 'maps_event_id_fk',
            columnNames: ['eventId'],
            referencedTableName: 'events',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
        indices: [
          new TableIndex({
            name: 'maps_event_id_idx',
            columnNames: ['eventId'],
          }),
        ],
      }),
      true,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('maps', true);
    await queryRunner.dropTable('events', true);
  }
}
