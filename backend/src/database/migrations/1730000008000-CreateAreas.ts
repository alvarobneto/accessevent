import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAreas1730000008000 implements MigrationInterface {
  name = 'CreateAreas1730000008000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "areas" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "mapId" uuid NOT NULL,
        "name" character varying(120) NOT NULL,
        "type" character varying(32) NOT NULL,
        "geometry" jsonb NOT NULL,
        "description" text,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_areas" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX "areas_map_id_idx" ON "areas" ("mapId")`);
    await queryRunner.query(`
      ALTER TABLE "areas"
        ADD CONSTRAINT "areas_map_id_fk"
        FOREIGN KEY ("mapId") REFERENCES "maps"("id")
        ON DELETE CASCADE ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "areas" DROP CONSTRAINT "areas_map_id_fk"`);
    await queryRunner.query(`DROP INDEX "public"."areas_map_id_idx"`);
    await queryRunner.query(`DROP TABLE "areas"`);
  }
}
