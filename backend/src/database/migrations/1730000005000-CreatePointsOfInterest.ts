import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePointsOfInterest1730000005000 implements MigrationInterface {
  name = 'CreatePointsOfInterest1730000005000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "points_of_interest" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "mapId" uuid NOT NULL,
        "name" character varying(120) NOT NULL,
        "type" character varying(32) NOT NULL,
        "position" jsonb NOT NULL,
        "description" text,
        "accessibilityInfo" text,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_points_of_interest" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "pois_map_id_idx" ON "points_of_interest" ("mapId")`,
    );

    await queryRunner.query(`
      ALTER TABLE "points_of_interest"
        ADD CONSTRAINT "pois_map_id_fk"
        FOREIGN KEY ("mapId")
        REFERENCES "maps"("id")
        ON DELETE CASCADE
        ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "points_of_interest" DROP CONSTRAINT "pois_map_id_fk"`,
    );
    await queryRunner.query(`DROP INDEX "public"."pois_map_id_idx"`);
    await queryRunner.query(`DROP TABLE "points_of_interest"`);
  }
}
